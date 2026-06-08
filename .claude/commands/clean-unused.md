# Remove Unused Code

Scan the entire codebase for dead code and remove it. Report each removal before applying.

## What to scan

### 1. Unused exercise registry entries
Run: grep every `id: "..."` in `src/lib/exercises.ts`  
Compare against every `<Exercise id="..." />` in `src/content/courses/**/*.mdx`  
**Flag**: any exercise id that appears in the registry but in no lesson file

### 2. Unused TypeScript exports
Check for:
- Types/interfaces defined in `src/types/` that are never imported anywhere in `src/`
- Functions exported from `src/lib/utils.ts` that are never called outside that file
- Components in `src/components/` that are never imported anywhere

Use this approach: for each export, run a grep for its name across `src/**/*.{ts,tsx,mdx}` (excluding the defining file). If no match, it is unused.

### 3. Dead imports
Scan every `.ts` and `.tsx` file for imports that are never used in that file's body.
Common patterns to find:
```ts
import { Foo } from "..."  // Foo never referenced below
import type { Bar } from "..."  // Bar never used in a type position
```

### 4. Orphan files
Scan for:
- `.tsx` components in `src/components/` not imported by any other file and not a Next.js page
- Test files for modules that no longer exist
- Prompt files in `prompts/` that refer to file paths that don't exist

### 5. Commented-out code blocks
Find multi-line `//` comment blocks (3+ consecutive `//` lines) that appear to be disabled code rather than documentation. Flag them for manual review — do NOT auto-delete.

### 6. Console.log / debug statements
Find `console.log`, `console.warn`, `console.error` in `src/` files (excluding test files and intentional error boundaries).

## Rules

- **Do NOT remove** anything from `src/lib/exercises.ts` without confirming no lesson references it — the grep must be definitive.
- **Do NOT remove** TypeScript type exports that are re-exported or used by tests.
- **Do NOT remove** files referenced in `CLAUDE.md` even if not imported in source.
- When in doubt, flag as `[REVIEW]` rather than auto-deleting.

## Output format

For each issue:
```
[REMOVE] src/lib/exercises.ts: exercise id "old-exercise-id" — not referenced in any lesson
[REMOVE] src/components/OldComponent.tsx — never imported
[REVIEW] src/lib/utils.ts:42 — console.log("debug") 
[REVIEW] src/types/course.ts: interface OldType — appears unused but verify
```

After listing all findings:
1. Apply all `[REMOVE]` items (unless the user says stop)
2. Leave `[REVIEW]` items for the user to decide
3. Run `npm test` to confirm nothing broke
4. Run `npm run build` to confirm the build is clean
