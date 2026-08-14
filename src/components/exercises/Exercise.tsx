import { getExercise } from "@/lib/exercises";
import { ExerciseClient } from "./ExerciseClient";

interface Props {
  /** Id of an exercise defined in the registry (`src/lib/exercises.ts`). */
  id: string;
}

/**
 * Server component: resolves `<Exercise id="..." />` against the registry at
 * render time and hands the single exercise to the interactive client half.
 *
 * The lookup deliberately stays on the server. `src/lib/exercises.ts` holds
 * every exercise on the site (~800 KB); importing it from a client component
 * put the whole registry into the shared bundle of all 331 content pages, so a
 * lesson with three questions downloaded all 771. Resolving here means only the
 * rendered exercises are serialized into the page.
 */
export function Exercise({ id }: Props) {
  const exercise = getExercise(id);

  if (!exercise) {
    return (
      <div className="not-prose card-glass p-6 my-8 border-accent-rose/40 text-rose-300 text-sm">
        Unknown exercise id: <code>{id}</code>. Add it to{" "}
        <code>src/lib/exercises.ts</code>.
      </div>
    );
  }

  return <ExerciseClient exercise={exercise} />;
}
