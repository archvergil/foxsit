import {
  BookHeart, BookOpenCheck, BriefcaseBusiness, CircleDollarSign, Dumbbell, Folder,
  Gamepad2, GraduationCap, HeartPulse, House, Languages, Landmark, Laptop,
  Music2, Palette, Plane, Sprout, Target, Utensils, type LucideIcon,
} from 'lucide-react'

export interface HabitProjectIconOption {
  value: string
  label: string
  icon: LucideIcon
}

export const habitProjectIconOptions: HabitProjectIconOption[] = [
  { value: 'folder', label: 'General', icon: Folder },
  { value: 'dumbbell', label: 'Fitness', icon: Dumbbell },
  { value: 'graduation-cap', label: 'Studies', icon: GraduationCap },
  { value: 'briefcase-business', label: 'Work', icon: BriefcaseBusiness },
  { value: 'heart-pulse', label: 'Health', icon: HeartPulse },
  { value: 'target', label: 'Goals', icon: Target },
  { value: 'book-open-check', label: 'Reading', icon: BookOpenCheck },
  { value: 'book-heart', label: 'Journal', icon: BookHeart },
  { value: 'languages', label: 'Language', icon: Languages },
  { value: 'laptop', label: 'Digital', icon: Laptop },
  { value: 'utensils', label: 'Food', icon: Utensils },
  { value: 'sprout', label: 'Home', icon: Sprout },
  { value: 'house', label: 'Household', icon: House },
  { value: 'music-2', label: 'Music', icon: Music2 },
  { value: 'palette', label: 'Creative', icon: Palette },
  { value: 'plane', label: 'Travel', icon: Plane },
  { value: 'landmark', label: 'Learning', icon: Landmark },
  { value: 'circle-dollar-sign', label: 'Budget', icon: CircleDollarSign },
  { value: 'gamepad-2', label: 'Leisure', icon: Gamepad2 },
]

