import type { TaskProject } from './types'

export interface TaskProjectTreeItem {
  project: TaskProject
  depth: number
}

const sorted = (projects: TaskProject[]) => [...projects].sort((left, right) =>
  left.position - right.position || left.createdAt.localeCompare(right.createdAt))

export const flattenTaskProjects = (projects: TaskProject[]): TaskProjectTreeItem[] => {
  const result: TaskProjectTreeItem[] = []
  const append = (parentId: string | null, depth: number, visited: Set<string>) => {
    for (const project of sorted(projects.filter((item) => (item.parentProjectId ?? null) === parentId))) {
      if (visited.has(project.id)) continue
      result.push({ project, depth })
      append(project.id, depth + 1, new Set([...visited, project.id]))
    }
  }
  append(null, 0, new Set())
  for (const project of sorted(projects)) {
    if (!result.some(({ project: item }) => item.id === project.id)) result.push({ project, depth: 0 })
  }
  return result
}

export const taskProjectWithDescendants = (projects: TaskProject[], projectId: string) => {
  const ids = new Set([projectId])
  let changed = true
  while (changed) {
    changed = false
    for (const project of projects) {
      if (project.parentProjectId && ids.has(project.parentProjectId) && !ids.has(project.id)) {
        ids.add(project.id)
        changed = true
      }
    }
  }
  return [...ids]
}
