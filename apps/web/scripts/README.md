# Maintenance scripts

One-off database utilities for local development. Not used at runtime.

| Script | Purpose |
|--------|---------|
| `cleanup-parent-role-data.ts` | Remove legacy parent-role data |
| `fix-duplicate-class-slots.ts` | Deduplicate schedule slots |
| `rebalance-schedule.ts` | Rebalance schedule entries |
| `remove-parent-rows.ts` | Drop obsolete parent-related rows |

Run from `apps/web` with `npx tsx scripts/<name>.ts` after configuring `.env`.
