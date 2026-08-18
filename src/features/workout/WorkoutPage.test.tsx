import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import type { WorkoutRepository } from './repository'
import type {
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutRoutineExerciseInput,
  WorkoutRoutineInput,
  SaveWorkoutSetInput,
  WorkoutSession,
} from './types'
import WorkoutPage from './WorkoutPage'
import { WorkoutRepositoryProvider } from './WorkoutRepositoryProvider'

const USER_ID = 'a13075d3-fc92-45a0-8fa5-bc790046fb8a'

class MemoryWorkoutRepository implements WorkoutRepository {
  routines: WorkoutRoutine[] = []
  activeSession: WorkoutSession | null = null

  listRoutines(): Promise<WorkoutRoutine[]> { return Promise.resolve(this.routines) }
  createRoutine(userId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine> {
    const routine: WorkoutRoutine = {
      id: crypto.randomUUID(), userId, ...input, position: 1000, archivedAt: null,
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z', exercises: [],
    }
    this.routines.push(routine)
    return Promise.resolve(routine)
  }
  updateRoutine(_userId: string, routineId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine> {
    const routine = this.routines.find(({ id }) => id === routineId)
    if (!routine) return Promise.reject(new Error('Routine not found.'))
    const updated = { ...routine, ...input, updatedAt: '2026-08-18T13:00:00.000Z' }
    this.routines = this.routines.map((item) => item.id === routineId ? updated : item)
    return Promise.resolve(updated)
  }
  deleteRoutine(_userId: string, routineId: string): Promise<void> {
    this.routines = this.routines.filter(({ id }) => id !== routineId)
    return Promise.resolve()
  }
  createExercise(userId: string, input: WorkoutRoutineExerciseInput): Promise<WorkoutRoutineExercise> {
    const routine = this.routines.find(({ id }) => id === input.routineId)
    if (!routine) return Promise.reject(new Error('Routine not found.'))
    const exercise: WorkoutRoutineExercise = {
      id: crypto.randomUUID(), userId, ...input, position: (routine.exercises.length + 1) * 1000,
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    }
    this.routines = this.routines.map((item) => item.id === routine.id
      ? { ...item, exercises: [...item.exercises, exercise] }
      : item)
    return Promise.resolve(exercise)
  }
  deleteExercise(_userId: string, exerciseId: string): Promise<void> {
    this.routines = this.routines.map((routine) => ({
      ...routine, exercises: routine.exercises.filter(({ id }) => id !== exerciseId),
    }))
    return Promise.resolve()
  }
  getActiveSession(): Promise<WorkoutSession | null> { return Promise.resolve(this.activeSession) }
  startSession(userId: string, routineId: string): Promise<WorkoutSession> {
    if (this.activeSession) return Promise.resolve(this.activeSession)
    const routine = this.routines.find(({ id }) => id === routineId)
    if (!routine || routine.exercises.length === 0) return Promise.reject(new Error('Add at least one exercise.'))
    this.activeSession = {
      id: crypto.randomUUID(), userId, routineId, routineName: routine.name, status: 'active',
      startedAt: '2026-08-18T12:00:00.000Z', endedAt: null, durationSeconds: null, notes: null,
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
      exercises: routine.exercises.map((exercise) => ({
        ...exercise, sessionId: 'session-id', sourceRoutineExerciseId: exercise.id,
        sets: Array.from({ length: exercise.targetSets }, (_, index) => ({
          id: crypto.randomUUID(), userId, sessionId: 'session-id', sessionExerciseId: exercise.id,
          setNumber: index + 1, weightKg: null, reps: null, rir: null, completedAt: null,
          createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
        })),
      })),
    }
    return Promise.resolve(this.activeSession)
  }
  saveSet(_userId: string, input: SaveWorkoutSetInput): Promise<void> {
    if (!this.activeSession) return Promise.reject(new Error('No active workout.'))
    this.activeSession = {
      ...this.activeSession,
      exercises: this.activeSession.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => set.id === input.setId ? {
          ...set, weightKg: input.weightKg, reps: input.reps, rir: input.rir, completedAt: '2026-08-18T12:10:00.000Z',
        } : set),
      })),
    }
    return Promise.resolve()
  }
  cancelSession(): Promise<void> { this.activeSession = null; return Promise.resolve() }
}

const authValue: AuthContextValue = {
  session: {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600, token_type: 'bearer',
    user: { id: USER_ID, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-08-18T12:00:00.000Z' },
  } satisfies Session,
  status: 'authenticated', signIn: () => Promise.resolve(), signUp: () => Promise.resolve(true),
  signOut: () => Promise.resolve(), requestPasswordReset: () => Promise.resolve(), updatePassword: () => Promise.resolve(),
}

const renderPage = (repository: WorkoutRepository) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkoutRepositoryProvider repository={repository}>
          <MemoryRouter initialEntries={['/workout/routines']}>
            <Routes>
              <Route path="/workout/routines" element={<WorkoutPage />} />
              <Route path="/workout/routine/:routineId" element={<WorkoutPage />} />
              <Route path="/workout/session/active" element={<WorkoutPage />} />
            </Routes>
          </MemoryRouter>
        </WorkoutRepositoryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('Workout routine flow', () => {
  it('creates a routine and persists its first exercise', async () => {
    const repository = new MemoryWorkoutRepository()
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'Create routine' }))
    const editor = screen.getByLabelText('Create workout routine')
    await user.type(within(editor).getByRole('textbox', { name: 'Name' }), 'Upper body')
    await user.type(within(editor).getByRole('textbox', { name: 'Description' }), 'Strength day')
    await user.click(within(editor).getByRole('button', { name: 'Create routine' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Upper body' })).toBeVisible()
    expect(repository.routines).toHaveLength(1)

    await user.type(screen.getByRole('textbox', { name: 'Exercise' }), 'Bench press')
    await user.type(screen.getByRole('textbox', { name: 'Muscle group' }), 'Chest')
    await user.click(screen.getByRole('button', { name: 'Add exercise' }))

    await waitFor(() => expect(repository.routines[0]?.exercises).toHaveLength(1))
    expect(await screen.findByText('Bench press')).toBeVisible()
    expect(screen.getByText('Chest · 3 × 8–12')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Start workout' }))
    const weightInput = await screen.findByRole('spinbutton', { name: 'Bench press set 1 weight in kilograms' })
    expect(screen.getByRole('heading', { level: 2, name: 'Upper body' })).toBeVisible()

    await user.type(weightInput, '40')
    await user.type(screen.getByRole('spinbutton', { name: 'Bench press set 1 repetitions' }), '10')
    await user.type(screen.getByRole('spinbutton', { name: 'Bench press set 1 reps in reserve' }), '2')
    await user.click(screen.getAllByRole('button', { name: 'Complete' })[0]!)

    await waitFor(() => expect(repository.activeSession?.exercises[0]?.sets[0]).toMatchObject({
      weightKg: 40, reps: 10, rir: 2,
    }))
    expect(await screen.findByLabelText('Rest timer')).toBeVisible()
  })
})
