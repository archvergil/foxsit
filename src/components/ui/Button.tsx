import { LoaderCircle } from 'lucide-react'
import { Children, forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) {
  const content = Children.toArray(children).map((child, index) => (
    typeof child === 'string' || typeof child === 'number'
      ? <span className="button__label" key={`${String(child)}-${index}`}>{child}</span>
      : child
  ))

  return (
    <button
      ref={ref}
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoaderCircle className="button__spinner" aria-hidden /> : null}
      {content}
    </button>
  )
})
