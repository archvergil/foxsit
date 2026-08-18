import { BriefcaseBusiness, Dumbbell, Folder, GraduationCap, HeartPulse } from 'lucide-react'

export function HabitProjectGlyph({ icon }: { icon: string | null }) {
  if (icon === 'dumbbell') return <Dumbbell aria-hidden />
  if (icon === 'graduation-cap') return <GraduationCap aria-hidden />
  if (icon === 'briefcase-business') return <BriefcaseBusiness aria-hidden />
  if (icon === 'heart-pulse') return <HeartPulse aria-hidden />
  return <Folder aria-hidden />
}
