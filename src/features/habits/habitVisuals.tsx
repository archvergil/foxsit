import type { CSSProperties } from 'react'

import type { Habit, HabitColorToken, HabitIcon } from './types'

export const habitIconOptions: Array<{ value: HabitIcon; label: string }> = [
  { value: 'circle-check-big', label: 'Check in' },
  { value: 'glass-water', label: 'Water' },
  { value: 'book-open', label: 'Read' },
  { value: 'dumbbell', label: 'Train' },
  { value: 'footprints', label: 'Move' },
  { value: 'brain', label: 'Mind' },
]

export const habitColorOptions: Array<{ value: HabitColorToken; label: string; valueHex: string }> = [
  { value: 'mint', label: 'Mint', valueHex: '#8eb9a7' },
  { value: 'coral', label: 'Coral', valueHex: '#d88f83' },
  { value: 'blue', label: 'Blue', valueHex: '#88aeca' },
  { value: 'sand', label: 'Sand', valueHex: '#d8bb86' },
  { value: 'slate', label: 'Slate', valueHex: '#9099a0' },
]

export const colorOptionForHabit = (colorToken: HabitColorToken) =>
  habitColorOptions.find((option) => option.value === colorToken) ?? habitColorOptions[0]!

const contrastForHex = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16))
  if (!channels || channels.length !== 3) return '#121513'
  const red = channels[0]! / 255
  const green = channels[1]! / 255
  const blue = channels[2]! / 255
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  return luminance > 0.54 ? '#121513' : '#ffffff'
}

export const habitAccentStyle = (habit: Pick<Habit, 'customColor'>): CSSProperties | undefined => {
  if (!habit.customColor) return undefined
  return {
    '--habit-accent': habit.customColor,
    '--habit-accent-ink': contrastForHex(habit.customColor),
  } as CSSProperties
}
