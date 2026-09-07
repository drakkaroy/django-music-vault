interface LibDotProps {
  color: string
  /** Default size (9px) comes from styles.css; pass one to override, e.g.
   * the 14px dot next to a library's name in its own page header. */
  size?: number
}

export function LibDot({ color, size }: LibDotProps) {
  return (
    <span
      className="lib-dot"
      style={
        size
          ? { background: color, width: size, height: size, display: 'inline-block' }
          : { background: color }
      }
    />
  )
}
