import { Dumbbell } from 'lucide-react'

import { ModuleFoundationPage } from '@/components/layout/ModuleFoundationPage'

export default function WorkoutPage() {
  return (
    <ModuleFoundationPage
      eyebrow="Train with context"
      title="Workout"
      description="Routines, local-first active sessions and progression without losing a set."
      icon={Dumbbell}
      milestone="The normalized schema and active workout draft are planned for Phase 6. The legacy catalog was not present to audit."
      links={[
        { label: 'Overview', to: '/workout' },
        { label: 'Routines', to: '/workout/routines' },
        { label: 'History', to: '/workout/history' },
      ]}
    />
  )
}
