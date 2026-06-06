# Maintenance scripts

One-off database utilities in `tools/`. They are **not** used at runtime and are intended for local development or manual ops.

| Script | Purpose |
|--------|---------|
| `cleanup-parent-role-data.ts` | Remove legacy parent-role data |
| `fix-duplicate-class-slots.ts` | Deduplicate schedule slots |
| `rebalance-schedule.ts` | Rebalance schedule entries |
| `remove-parent-rows.ts` | Drop obsolete parent-related rows |

## How to run

From the repository root with `.env` configured:

```bash
npx tsx tools/<script-name>.ts
```

Always review the script source before running against a non-local database.
