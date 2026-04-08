# npm-package-publish

A GitHub composite action that builds and publishes an npm package with automatic version management, npm tag resolution, git release commits, and artifact uploading.

## How it works

1. **Version resolution** — Computes the next version based on the release type:
   - `nightly` — generates a timestamped pre-release version (e.g. `3.0.0-nightly-20260223-abc123def`), either based on the version published as latest (minor + 1), or based on the exact version passed to the action
   - `beta` / `rc` — generates an incremented pre-release version (e.g. `3.0.0-beta.1`, `3.0.0-rc.2`)
   - `stable` — uses the stable version inferred from the branch name (assumes `x.y-stable` format for branch name), or a manually provided version
2. **npm tag resolution** — Automatically assigns the correct dist-tag (`nightly`, `next`, `latest`) based on the release type and whether the version is newer than what is currently tagged `latest` on the registry.
3. **Validation** — Validates that the version being published is sane relative to what already exists on the registry.
4. **Build & publish** — Runs `npm pack` in the package directory, uploads the `.tgz` artifact to GitHub, and publishes it via `npm publish --provenance`.
5. **Git bookkeeping** (stable only) — Creates a `Release vX.Y.Z` commit and an annotated git tag, then pushes them (unless `dry-run` is `true` or the branch is `main`).

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `package-name` | Yes | — | Name of the package to publish (as it appears on the npm registry). |
| `package-json-path` | Yes | — | Path to the `package.json` file that should have its `version` field updated. |
| `release-type` | No | `nightly` | Release type. One of: `stable`, `nightly`, `beta`, `rc`. |
| `version` | No | - | Explicit version to publish in `x.y.z` format. Typically inferred from branch name for stable releases; not applicable for nightly. |
| `version-getter-script` | No | - | Path to a custom script that determines the version to publish. When provided, the action runs this script instead of the built-in version resolution logic. It receives `--package-name <package-name>`, `--package-json-path <package-json-path>`, `--version <version>` and release type (`--nightly`, `--beta`, `--rc`) as parameters and should print to STDOUT the resolved version value. |
| `npm-tag` | No | - | Explicit npm dist-tag to publish under. When provided, skips automatic tag resolution entirely. |
| `perform-git-operations` | No | `true` | Whether to perform git operations (committing the version change and pushing tags). |
| `dry-run` | No | `true` | When `true`, runs `npm publish --dry-run` and skips `git push`. Set to `false` for a real release. |
| `install-dependencies-command` | No | `yarn install --immutable` | Command used to install project dependencies before building. |

## Setup guide

### 1. Configure npm Trusted Publishing

This action publishes with `--provenance`, which means it authenticates via OIDC instead of a stored npm access token. You must configure your workflow as a [Trusted Publisher on npm](https://docs.npmjs.com/trusted-publishers#configuring-trusted-publishing) before the action can publish anything.

In your npm package settings, add a GitHub Actions trusted publisher and provide:
- Your GitHub org/user and repository name
- The workflow file name (e.g. `publish.yml`)
- Optionally, the environment name if you use GitHub Environments

The calling workflow must also declare the `id-token: write` permission so GitHub can mint the OIDC token:

```yaml
permissions:
  contents: write  # needed to push release commits and tags for stable releases
  id-token: write  # required for OIDC / npm provenance
```

### 2. Pin the action to a commit hash

Always reference the action by a full commit SHA rather than a branch name or a mutable tag. Branch names like `@main` can point to any commit at any time; pinning to a SHA guarantees you are running exactly the code you reviewed.

```yaml
uses: software-mansion/npm-package-publish@<full-commit-sha>
```

### 3. Choose an automation strategy

#### No automation — fully manual

The simplest setup: a `workflow_dispatch` trigger lets you kick off any release type by hand from the GitHub Actions UI. No releases happen unless someone explicitly triggers the workflow.

```yaml
on:
  workflow_dispatch:
    inputs:
      release-type:
        description: Type of release to publish.
        type: choice
        options: [stable, nightly, beta, rc]
        default: stable
      version:
        description: Explicit version (leave empty to infer automatically).
        type: string
        required: false
        default: ''
      dry-run:
        description: Dry run (no actual publish).
        type: boolean
        default: true
```

#### Automated nightlies via cron

Add a `schedule` trigger to publish nightlies automatically. Pair it with `workflow_dispatch` so you can still trigger other release types manually:

```yaml
on:
  schedule:
    - cron: '27 23 * * *'  # every day at 23:27 UTC
  workflow_dispatch:
    inputs:
      release-type:
        description: Type of release to publish.
        type: choice
        options: [stable, nightly, beta, rc]
        default: stable
      version:
        description: Explicit version (leave empty to infer automatically).
        type: string
        required: false
        default: ''
      dry-run:
        description: Dry run (no actual publish).
        type: boolean
        default: true
```

Then in the job, dispatch on the event name:

```yaml
- name: Publish manual release
  if: ${{ github.event_name == 'workflow_dispatch' }}
  uses: software-mansion/npm-package-publish@<commit-sha>
  with:
    package-name: 'my-package'
    package-json-path: 'packages/my-package/package.json'
    release-type: ${{ inputs.release-type }}
    version: ${{ inputs.version }}
    dry-run: ${{ inputs.dry-run }}

- name: Publish automatic nightly
  if: ${{ github.event_name == 'schedule' }}
  uses: software-mansion/npm-package-publish@<commit-sha>
  with:
    package-name: 'my-package'
    package-json-path: 'packages/my-package/package.json'
    release-type: 'nightly'
    dry-run: false
```

### 4. Understand automatic version resolution

The action infers the version to publish based on the release type. Understanding this logic helps you decide when to let it run automatically and when to override.

**Nightly** — If no `version` is provided, the action reads the current `latest` tag from the npm registry, increments the minor component by 1, and uses that as the base for the nightly version string (e.g. if `latest` is `2.30.0`, the nightly base becomes `2.31.0`, resulting in `2.31.0-nightly-20260223-abc123def`).

This works correctly as long as the in-development major version matches the latest published major version. If your repository's `main` branch has already moved to a new major (e.g. you are developing `3.x` but `latest` on npm is still `2.30.0`), the automatic resolution will produce `2.31.0-nightly-…` instead of the intended `3.0.0-nightly-…`. In that case, pass the explicit base version:

```yaml
- name: Publish automatic nightly
  uses: software-mansion/npm-package-publish@<commit-sha>
  with:
    package-name: 'my-package'
    package-json-path: 'packages/my-package/package.json'
    release-type: 'nightly'
    version: '3.0.0'  # override because main is already 3.x
    dry-run: false
```

**Beta / RC** — The base version is inferred from the current branch name, which is expected to follow the `x.y-stable` pattern (e.g. `2.31-stable`). The action strips the branch suffix and uses `x.y.0` as the base, then increments the pre-release counter (e.g. `2.31.0-beta.1`, `2.31.0-beta.2`, …). You can also pass an explicit `version` to override this.

**Stable** — The `major.minor` is read from the branch name in `x.y-stable` format. The patch number is determined automatically by querying the npm registry for all versions published under that `x.y.x` range and incrementing the highest one (e.g. if `2.31.3` is the latest patch, the next stable will be `2.31.4`). If no versions exist yet for that range, patch starts at `0`. Stable releases are intended to be cut from a dedicated release branch, not from `main`. You can pass an explicit `version` to override the entire resolved version. Note: when run on `main`, the release commit and git tag are skipped even if `dry-run` is `false`.

### 5. Complete example workflow

```yaml
name: Publish to npm

on:
  schedule:
    - cron: '27 23 * * *'
  workflow_dispatch:
    inputs:
      release-type:
        description: Type of release to publish.
        type: choice
        options: [stable, nightly, beta, rc]
        default: stable
      version:
        description: Explicit version in x.y.z format (leave empty to infer).
        type: string
        required: false
        default: ''
      dry-run:
        description: Dry run — no actual publish or git push.
        type: boolean
        default: true

jobs:
  publish:
    runs-on: ubuntu-latest

    permissions:
      contents: write
      id-token: write

    concurrency:
      group: publish-${{ github.ref }}
      cancel-in-progress: false

    steps:
      - name: Check out
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org/

      - name: Publish manual release
        if: ${{ github.event_name == 'workflow_dispatch' }}
        uses: software-mansion/npm-package-publish@<commit-sha>
        with:
          package-name: 'my-package'
          package-json-path: 'packages/my-package/package.json'
          install-dependencies-command: 'yarn install --immutable'
          release-type: ${{ inputs.release-type }}
          version: ${{ inputs.version }}
          dry-run: ${{ inputs.dry-run }}

      - name: Publish automatic nightly
        if: ${{ github.event_name == 'schedule' }}
        uses: software-mansion/npm-package-publish@<commit-sha>
        with:
          package-name: 'my-package'
          package-json-path: 'packages/my-package/package.json'
          install-dependencies-command: 'yarn install --immutable'
          release-type: 'nightly'
          dry-run: false
```

## npm dist-tags

The action automatically selects the appropriate npm dist-tag:

| Release type | Condition | Tag applied |
|---|---|---|
| `nightly` | always | `nightly` |
| `beta` or `rc` | always | `next` |
| `stable` | version is newer than current `latest` | `latest` |
