# Maintenance scripts

One-off database utilities for local development. Not used at runtime.

See [docs/development/scripts.md](../docs/development/scripts.md).

| Script | Purpose |
|--------|---------|
| `cleanup-parent-role-data.ts` | Remove legacy parent-role data |
| `fix-duplicate-class-slots.ts` | Deduplicate schedule slots |
| `rebalance-schedule.ts` | Rebalance schedule entries |
| `remove-parent-rows.ts` | Drop obsolete parent-related rows |

Run with `npx tsx tools/<name>.ts` from the repository root after configuring `.env`.
