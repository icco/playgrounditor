# playgrounditor

An Android editor for text files in your GitHub repositories.

## Install

Download the APK from the [latest release](https://github.com/icco/playgrounditor/releases/latest) and open it on your phone.

## Usage

1. Sign in with GitHub, or paste a personal access token with `repo` scope.
2. Pick a repository and browse to a file, or tap + to start a new Markdown file.
3. Tap Save, then open a pull request or commit to the default branch.

Repositories, folders and recently opened files stay available offline. Edits are saved on the device as drafts, and you commit them once you are back online. Signing out deletes all of this.

## Development

```sh
pnpm install
pnpm android
```
