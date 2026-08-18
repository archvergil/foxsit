import { RouterProvider } from 'react-router-dom'

import { ReloadPrompt } from '@/components/feedback/ReloadPrompt'
import { router } from './router'

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ReloadPrompt />
    </>
  )
}
