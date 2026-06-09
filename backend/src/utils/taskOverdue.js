function isTaskOverdue(task, now = new Date()) {
  if (task.completed) return false;
  return new Date(task.dueDate) < now;
}

function countOverdueTasks(tasks, now = new Date()) {
  return tasks.filter((task) => isTaskOverdue(task, now)).length;
}

function serializeTask(task, now = new Date()) {
  return {
    ...task,
    isOverdue: isTaskOverdue(task, now),
  };
}

module.exports = { isTaskOverdue, countOverdueTasks, serializeTask };
