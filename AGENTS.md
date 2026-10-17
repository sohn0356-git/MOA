# Repository Instructions

- After making code changes, run `npm run build`.
- If the build succeeds, commit the completed changes and push them to the current branch.
- Do not leave completed work only in the local working tree unless the user explicitly asks not to push.

## Improvement routine
- At each user-triggered routine, review the live suggestions board and docs/improvements.json before choosing work. Do not register duplicates.
- After changing a requirement, summarize its title and intended behavior in the conversation.
- Mark an item implemented in docs/improvements.json only after code review and relevant tests. The sync workflow checks it complete in the app only after a successful Pages test/build/deploy run for that commit.
- For pre-existing board items not listed in the manifest, verify the actual implementation and tests, then add the exact existing title and an implementation evidence note to the manifest before marking implemented. Never infer completion solely from a similar title.
- Check the Sync App Improvement Requests workflow result and report whether registration/completion succeeded. Do not claim a database update when the workflow failed.
- No daily Codex scheduler is configured; these instructions apply whenever a routine is actually run.
