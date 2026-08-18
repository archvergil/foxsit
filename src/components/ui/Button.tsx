import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoaderCircle className="button__spinner" aria-hidden /> : null}
      <span>{children}</span>
    </button>
  )
}
