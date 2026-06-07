# Prompt: Add a New Exercise Type

> Paste this into Claude Code, filling in the [BRACKETS].

---

Add a new exercise type called **[TYPE NAME]** to the ml-viz exercise system.

**Type key:** `[kebab-case]` (e.g. "drag-drop", "fill-blank", "code")

**What the user does:** [Describe the interaction]

**Steps:**
1. Add the new type to `src/types/exercise.ts`:
   - Add `"[type-key]"` to the `ExerciseType` union
   - Define a new interface `[TypeName]Exercise extends BaseExercise` with any extra fields
   - Add it to the `Exercise` union type

2. Create `src/components/exercises/[TypeName]Exercise.tsx`:
   - Accept props: `exercise: [TypeName]Exercise`, `onAnswer: (isCorrect: boolean) => void`, `locked: boolean`
   - Handle user interaction and call `onAnswer` when the user submits
   - Use the same visual style as `MultipleChoiceExercise.tsx` (accent-teal for correct, accent-rose for wrong)

3. Add a branch in `src/components/exercises/Exercise.tsx`:
   ```tsx
   {exercise.type === "[type-key]" && (
     <[TypeName]Exercise exercise={exercise} onAnswer={handleAnswer} locked={result !== null} />
   )}
   ```
   (`Exercise` resolves the `id` from the registry, then dispatches on `type` —
   the sub-component still receives a fully-typed `exercise` object.)

**Authoring instances:** exercise data is defined in the registry
`src/lib/exercises.ts` and referenced from lessons by `<Exercise id="..." />`.
Lesson MDX never contains inline JS objects (it runs with `blockJS: true`).

See `src/components/exercises/MultipleChoiceExercise.tsx` and `SliderExercise.tsx` as references.
