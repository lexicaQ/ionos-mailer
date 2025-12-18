---
description: Procedures for committing and pushing changes
---

# Always Push Changes

This workflow ensures that all task completions are followed by a git commit and push.

1. **Verify Changes**: Ensure build passes and UI is correct.
2. **Stage Changes**: `git add .`
3. **Commit**: `git commit -m "feat/fix: descriptive message"`
// turbo
4. **Push**: `git push origin [branch]`
