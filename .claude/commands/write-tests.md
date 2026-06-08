# Write Tests

Argument: `$ARGUMENTS` — what to test, e.g. `course:linear-algebra`, `component:Exercise`, `util:getNotebookUrl`, or `all-new` to write tests for everything added since the last commit.

Write Vitest tests following the established patterns in `src/lib/__tests__/`. Add to an existing test file if the target is already covered there, or create a new file following the naming convention `src/lib/__tests__/<target>.test.ts`.

## Project test patterns

**Test file location:** `src/lib/__tests__/*.test.ts`  
**Runner:** Vitest v2, globals enabled, Node environment by default  
**DOM tests:** add `// @vitest-environment jsdom` at the top of the file  
**Path alias:** `@/` maps to `src/`

### Content integrity tests (follow `content-integrity.test.ts`)

For new courses, add `it.each(courseSlugs)` tests that:
1. Verify the `index.mdx` frontmatter (title, description, difficulty, topics, estimatedHours, prerequisites, order as number, coverColor)
2. Verify all lesson files have required frontmatter: title, description, order, type (concept|exercise|quiz|playground), estimatedMinutes
3. Verify `order` equals the numeric `NN-` prefix in the filename
4. Verify every `<Exercise id="...">` in lesson content resolves in the registry
5. Verify every `/courses/<course>/<lesson>` cross-link resolves to a real file
6. Verify companion notebook exists at `notebooks/<course>/<slug>.ipynb` and is valid JSON

### Exercise registry tests (follow `exercises.test.ts`)

For new exercises:
1. Registry is non-empty
2. All IDs are unique
3. Multiple-choice: exactly one `isCorrect: true` option per exercise
4. Slider: `min < max`, `step > 0`, `correctRange` within `[min, max]`
5. Every exercise has non-empty `question` and `explanation`

### Utility tests (follow `utils.test.ts`)

For new utilities in `src/lib/utils.ts`:
1. Normal case
2. Edge cases (empty input, boundary values, wrong types)
3. For URL builders: test with and without env var overrides

### Component tests (if requested)

For React components, use `@vitest-environment jsdom` and `@testing-library/react` (check if installed before using):
1. Renders without crashing
2. Correct initial state
3. Key interaction (click, input change)
4. Accessibility: important elements have correct ARIA labels

## What NOT to test

- Implementation details (internal state variable names)  
- Third-party library behaviour (D3, Framer Motion — they have their own tests)  
- Visual/CSS properties  
- Build process (that's Next.js's job)

## After writing

1. Run `npm test` to confirm all new tests pass
2. Run `npm test -- --reporter=verbose` to show each test name
3. Report the count: X new tests, Y test files modified/created
