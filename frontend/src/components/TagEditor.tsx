import { useRef, useState } from 'react'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const t = draft.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setDraft('')
  }

  return (
    <div className="tag-editor" onClick={() => inputRef.current?.focus()}>
      {tags.map((t, i) => (
        <span className="tg" key={t}>
          {t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((_, idx) => idx !== i))
            }}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        placeholder="add a tag…"
        aria-label="Add tag"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
            e.preventDefault()
            addTag()
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
      />
    </div>
  )
}
