import { render, screen, waitFor } from '@testing-library/react'
import { Dumbbell } from 'lucide-react'

import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'

describe('shared controls', () => {
  it('keeps icon and label as separate flex items', () => {
    render(<Button><Dumbbell aria-hidden />Start workout</Button>)

    const button = screen.getByRole('button', { name: 'Start workout' })
    expect(button.querySelector(':scope > svg')).toBeInTheDocument()
    expect(button.querySelector(':scope > .button__label')).toHaveTextContent('Start workout')
  })

  it('animates from the previous route position after remounting', async () => {
    const name = `calendar-test-${crypto.randomUUID()}`
    const first = render(<SegmentedControl activeIndex={0} label="Calendar view" name={name} options={3}><span>Month</span><span>Week</span><span>Day</span></SegmentedControl>)
    expect(screen.getByRole('navigation')).toHaveAttribute('data-active-index', '0')
    first.unmount()

    render(<SegmentedControl activeIndex={1} label="Calendar view" name={name} options={3}><span>Month</span><span>Week</span><span>Day</span></SegmentedControl>)
    const control = screen.getByRole('navigation')
    expect(control).toHaveAttribute('data-active-index', '0')
    await waitFor(() => expect(control).toHaveAttribute('data-active-index', '1'))
  })
})
