import type { Task } from './types'

export const moveTaskInList = (
  tasks: Task[],
  taskId: string,
  direction: 'up' | 'down',
) => {
  const index = tasks.findIndex(({ id }) => id === taskId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= tasks.length) return tasks
  const reordered = [...tasks]
  const [task] = reordered.splice(index, 1)
  if (!task) return tasks
  reordered.splice(target, 0, task)
  return reordered
}

export const mergeVisibleTaskOrder = (allOpenTasks: Task[], visibleOrder: Task[]) => {
  const visibleIds = new Set(visibleOrder.map(({ id }) => id))
  const queue = [...visibleOrder]
  const ordered = allOpenTasks.map((task) => visibleIds.has(task.id) ? queue.shift() ?? task : task)
  const allIds = new Set(allOpenTasks.map(({ id }) => id))
  return [...ordered, ...queue.filter(({ id }) => !allIds.has(id))]
}
