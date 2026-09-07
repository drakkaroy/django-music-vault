import type { ButtonHTMLAttributes } from 'react'
import './IconButton.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon-only buttons need a label a screen reader can announce — make it
   * impossible to forget by requiring it, rather than an optional prop. */
  'aria-label': string
}

export function IconButton({ className, type = 'button', ...rest }: IconButtonProps) {
  const classes = ['icon-btn', className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
