# AGENTS.md — Project conventions for code-generation agents

## Version bump strategy

The project uses **manual semantic versioning** via `npm version`.

```bash
npm version patch  # 1.9.8 → 1.9.9 (bug fixes)
npm version minor  # 1.9.8 → 1.10.0 (new features, backward-compatible)
npm version major  # 1.9.8 → 2.0.0 (breaking changes)
```

Steps for each release:
1. Update `doc/history.md` with the new version, date, and changelog entries.
2. Run `npm version <bump>` — this tags the commit and updates `package.json`.
3. Push the commit and tag: `git push && git push --tags`.

## Rollback procedure

If a release introduces a critical bug:

1. **Revert the version-bump commit** (includes the tag):
   ```bash
   git revert --no-commit <tag>..HEAD
   git commit -m "revert: vX.Y.Z"
   git tag -d vX.Y.Z          # delete local tag
   git push origin :vX.Y.Z    # delete remote tag
   ```
   Then push the revert commit.

2. **Hotfix on the previous version**: branch from the last known-good tag, fix, bump patch, tag, push.

3. **Vercel auto-deploys** from the default branch — the revert commit triggers a rollback deployment automatically.
