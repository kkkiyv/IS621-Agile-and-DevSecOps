import type { Task } from "../types";

export function isTaskOverdue(
  task: Pick<Task, "completed" | "dueDate">,
  now: Date = new Date()
): boolean {
  if (task.completed) return false;
  return new Date(task.dueDate) < now;
}

export function sortTasksForDisplay(tasks: Task[], now: Date = new Date()): Task[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a, now);
    const bOverdue = isTaskOverdue(b, now);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
