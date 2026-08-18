import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export function TextField({ label, error, hint, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input
        className="field__control"
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...props}
      />
      {error ? (
        <span className="field__message field__message--error" id={descriptionId}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__message" id={descriptionId}>
          {hint}
        </span>
      ) : null}
    </label>
  )
}
