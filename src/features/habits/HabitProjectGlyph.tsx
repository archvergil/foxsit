import { Folder } from 'lucide-react'

import { habitProjectIconOptions } from './habitProjectIcons'

export function HabitProjectGlyph({ icon }: { icon: string | null }) {
  const Icon = habitProjectIconOptions.find((option) => option.value === icon)?.icon ?? Folder
  return <Icon aria-hidden />
}
