export interface WorkoutSetMetricInput {
  weightKg: number | null
  reps: number | null
}

const roundToHundredths = (value: number) => Math.round(value * 100) / 100

export const calculateWorkoutSetMetrics = ({ weightKg, reps }: WorkoutSetMetricInput) => {
  if (reps === null || reps <= 0) return { volumeKg: 0, estimatedOneRepMaxKg: null }
  const volumeKg = roundToHundredths((weightKg ?? 0) * reps)
  if (weightKg === null || weightKg <= 0) return { volumeKg, estimatedOneRepMaxKg: null }
  return {
    volumeKg,
    estimatedOneRepMaxKg: reps === 1
      ? weightKg
      : roundToHundredths(weightKg * (1 + reps / 30)),
  }
}

export const formatWeightKg = (value: number) => `${new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
}).format(value)} kg`
