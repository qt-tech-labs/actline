export type StepStatus = "todo" | "doing" | "done";

/** A checklist drives its step: none ticked = todo, some = doing, all = done. */
export function statusFromItems(items: { done: boolean }[]): StepStatus {
  const done = items.filter((i) => i.done).length;
  return done === items.length ? "done" : done > 0 ? "doing" : "todo";
}
