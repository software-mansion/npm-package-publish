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
| `dry-run` | No | `true` | When `true`, runs `npm publish --dry-run` and skips `git push`. Set to `false` for a real release. |
| `install-dependencies-command` | No | `yarn install --immutable` | Command used to install project dependencies before building. |

## Example usage

```yaml
- name: Publish beta
  uses: software-mansion-labs/npm-package-publish@main
  with:
    package-name: my-package
    package-json-path: packages/my-package/package.json
    release-type: beta
    dry-run: "false"
```

## npm dist-tags

The action automatically selects the appropriate npm dist-tag:

| Release type | Condition | Tag applied |
|---|---|---|
| `nightly` | always | `nightly` |
| `beta` or `rc` | always | `next` |
| `stable` | version is newer than current `latest` | `latest` |

## Permissions

This action uses `npm publish --provenance`, which requires npm 11.5.1 or later for OIDC provenance support. npm 11.11.0 is installed automatically during the run. An npm access token or OIDC configuration in the calling workflow is also required.
