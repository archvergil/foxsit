import { Apple, BedDouble, Bike, BookHeart, BookOpen, Brain, BrushCleaning, CalendarCheck2, Camera, ChefHat, CircleCheckBig, CircleGauge, Coffee, Dumbbell, Footprints, GlassWater, HeartHandshake, Languages, Music2, NotebookPen, Pill, Sun, Utensils, WalletCards, type LucideIcon } from 'lucide-react'

import type { HabitIcon } from './types'

export function HabitGlyph({ icon }: { icon: HabitIcon }) {
  const glyphs: Record<HabitIcon, LucideIcon> = {
    'circle-check-big': CircleCheckBig, 'glass-water': GlassWater, 'book-open': BookOpen, dumbbell: Dumbbell, footprints: Footprints, brain: Brain,
    apple: Apple, 'bed-double': BedDouble, bike: Bike, 'book-heart': BookHeart, 'brush-cleaning': BrushCleaning, 'calendar-check-2': CalendarCheck2,
    camera: Camera, 'chef-hat': ChefHat, 'circle-gauge': CircleGauge, coffee: Coffee, 'heart-handshake': HeartHandshake, languages: Languages,
    'music-2': Music2, 'notebook-pen': NotebookPen, pill: Pill, sun: Sun, utensils: Utensils, 'wallet-cards': WalletCards,
  }
  const Icon = glyphs[icon]
  return <Icon aria-hidden />
}
