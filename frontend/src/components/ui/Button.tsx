import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Maps to the .btn-accent/.btn-ghost/.btn-danger modifier classes in
   * Button.css. Omit for the plain .btn look. */
  variant?: 'accent' | 'ghost' | 'danger'
}

export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', variant && `btn-${variant}`, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
