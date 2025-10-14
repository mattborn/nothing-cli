# nothing-cli

## `find`

Recursively walks from the current working directory, detects every directory containing a `build.js`, and prints a ✅/❌ depending on whether that repo’s second-to-last commit (HEAD~1) matches the latest commit hash in `~/Code/nothing-static`. Prints 🎉 Pando! when all projects pass.

## `init`

_Placeholder for the initialization workflow._

## `refactor`

Migrates an existing project to the nothing-static standard. Clones nothing-static, applies project customizations according to `files.csv` rules (lock/merge/skip), copies project-specific files, preserves git history with project’s first commit message as title and full timestamped history in description, and perserves remotes in `{projectName}-refactored` directory.

## `update`

Updates a refactored project to the latest nothing-static. Finds the original nothing-static base commit, fetches the latest from GitHub, creates a backup branch, and rebases all project commits onto the new base.
