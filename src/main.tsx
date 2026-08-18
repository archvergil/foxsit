import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import '@/styles/tokens.css'
import '@/styles/themes.css'
import '@/styles/global.css'
import '@/styles/components.css'
import '@/styles/auth.css'
import '@/styles/shell.css'
import '@/styles/pages.css'
import '@/styles/tasks.css'
import '@/styles/task-details.css'
import '@/styles/focus.css'
import '@/styles/calendar.css'
import '@/styles/habits.css'
import '@/styles/visual-banners.css'
import '@/styles/workout.css'
import '@/styles/responsive.css'

const root = document.getElementById('root')
if (!root) throw new Error('App root element not found.')

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
