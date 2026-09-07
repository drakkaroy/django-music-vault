import type { ButtonHTMLAttributes } from 'react'

export function FootButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = ['foot-btn', className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
