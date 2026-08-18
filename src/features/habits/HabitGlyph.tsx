import { BookOpen, Brain, CircleCheckBig, Dumbbell, Footprints, GlassWater } from 'lucide-react'

import type { HabitIcon } from './types'

export function HabitGlyph({ icon }: { icon: HabitIcon }) {
  switch (icon) {
    case 'glass-water': return <GlassWater aria-hidden />
    case 'book-open': return <BookOpen aria-hidden />
    case 'dumbbell': return <Dumbbell aria-hidden />
    case 'footprints': return <Footprints aria-hidden />
    case 'brain': return <Brain aria-hidden />
    default: return <CircleCheckBig aria-hidden />
  }
}
