import { useEffect, useRef, useState } from 'react'
import './App.css'

const EditorMode = {
  INSERT: 'INSERT',
  NORMAL: 'NORMAL',
}

const isWordChar = (char) => /[A-Za-z0-9_]/.test(char)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getLineStart = (text, index) => {
  const previousBreak = text.lastIndexOf('\n', Math.max(0, index - 1))
  return previousBreak === -1 ? 0 : previousBreak + 1
}

const getLineEnd = (text, index) => {
  const nextBreak = text.indexOf('\n', index)
  return nextBreak === -1 ? text.length : nextBreak
}

const getLineColumn = (text, index) => index - getLineStart(text, index)

const moveToLine = (text, index, direction, preferredColumn) => {
  const currentLineStart = getLineStart(text, index)
  const currentLineEnd = getLineEnd(text, index)
  const lineColumn = preferredColumn ?? index - currentLineStart

  if (direction < 0) {
    if (currentLineStart === 0) {
      return index
    }

    const previousLineEnd = currentLineStart - 1
    const previousLineStart = getLineStart(text, previousLineEnd)
    const previousLineLength = previousLineEnd - previousLineStart
    return previousLineStart + Math.min(lineColumn, previousLineLength)
  }

  if (currentLineEnd >= text.length) {
    return index
  }

  const nextLineStart = currentLineEnd + 1
  const nextLineEnd = getLineEnd(text, nextLineStart)
  const nextLineLength = nextLineEnd - nextLineStart
  return nextLineStart + Math.min(lineColumn, nextLineLength)
}

const moveToNextWordStart = (text, index) => {
  let cursor = clamp(index, 0, text.length)

  if (cursor >= text.length) {
    return text.length
  }

  if (isWordChar(text[cursor])) {
    while (cursor < text.length && isWordChar(text[cursor])) {
      cursor += 1
    }
  }

  while (cursor < text.length && !isWordChar(text[cursor])) {
    cursor += 1
  }

  return cursor
}

const moveToPreviousWordStart = (text, index) => {
  let cursor = clamp(index, 0, text.length)

  if (cursor === 0) {
    return 0
  }

  cursor -= 1

  while (cursor > 0 && !isWordChar(text[cursor])) {
    cursor -= 1
  }

  while (cursor > 0 && isWordChar(text[cursor - 1])) {
    cursor -= 1
  }

  return cursor
}

function App() {
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('untitled.txt')
  const [mode, setMode] = useState(EditorMode.INSERT)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)
  const preferredColumnRef = useRef(null)

  const handleOpenClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setContent(String(loadEvent.target?.result ?? ''))
      setFileName(file.name || 'untitled.txt')
    }
    reader.readAsText(file)

    // Reset file input so selecting the same file fires change again.
    event.target.value = ''
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName || 'untitled.txt'
    link.click()

    URL.revokeObjectURL(url)
  }

  const setCursor = (nextPosition, targetMode = mode) => {
    const textarea = textAreaRef.current
    if (!textarea) {
      return
    }

    const safePosition = clamp(nextPosition, 0, content.length)
    if (targetMode === EditorMode.NORMAL) {
      if (content.length === 0) {
        if (textarea.selectionStart !== 0 || textarea.selectionEnd !== 0) {
          textarea.setSelectionRange(0, 0)
        }
        return
      }

      const normalStart = clamp(safePosition, 0, content.length - 1)
      const normalEnd = normalStart + 1

      if (
        textarea.selectionStart !== normalStart ||
        textarea.selectionEnd !== normalEnd
      ) {
        textarea.setSelectionRange(normalStart, normalEnd)
      }
      return
    }

    if (textarea.selectionStart !== safePosition || textarea.selectionEnd !== safePosition) {
      textarea.setSelectionRange(safePosition, safePosition)
    }
  }

  const getCursorPosition = () => {
    const textarea = textAreaRef.current
    if (!textarea) {
      return 0
    }

    return textarea.selectionStart
  }

  useEffect(() => {
    if (mode !== EditorMode.NORMAL) {
      return
    }

    const cursor = getCursorPosition()
    setCursor(cursor, EditorMode.NORMAL)
  }, [content, mode])

  const handleEditorSelect = () => {
    if (mode !== EditorMode.NORMAL) {
      return
    }

    const cursor = getCursorPosition()
    setCursor(cursor, EditorMode.NORMAL)
  }

  const handleEditorKeyDown = (event) => {
    const textarea = textAreaRef.current
    if (!textarea) {
      return
    }

    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const cursor = selectionStart
    const hasSelection = selectionStart !== selectionEnd

    if (mode === EditorMode.INSERT) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMode(EditorMode.NORMAL)
        preferredColumnRef.current = null

        const nextCursor = hasSelection ? selectionStart : Math.max(0, cursor - 1)
        setCursor(nextCursor, EditorMode.NORMAL)
      }
      return
    }

    const collapseSelection = () => {
      if (hasSelection) {
        setCursor(selectionStart)
      }
    }

    switch (event.key) {
      case 'i':
        event.preventDefault()
        setMode(EditorMode.INSERT)
        preferredColumnRef.current = null
        setCursor(selectionStart, EditorMode.INSERT)
        collapseSelection()
        return
      case 'a':
        event.preventDefault()
        setCursor(Math.min(content.length, selectionStart + 1), EditorMode.INSERT)
        setMode(EditorMode.INSERT)
        preferredColumnRef.current = null
        return
      case 'h':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(Math.max(0, selectionStart - 1))
        return
      case 'l':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(selectionStart + 1, EditorMode.NORMAL)
        return
      case 'j': {
        event.preventDefault()
        const preferredColumn =
          preferredColumnRef.current ?? getLineColumn(content, selectionStart)
        preferredColumnRef.current = preferredColumn
        setCursor(moveToLine(content, selectionStart, 1, preferredColumn))
        return
      }
      case 'k': {
        event.preventDefault()
        const preferredColumn =
          preferredColumnRef.current ?? getLineColumn(content, selectionStart)
        preferredColumnRef.current = preferredColumn
        setCursor(moveToLine(content, selectionStart, -1, preferredColumn))
        return
      }
      case '0':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(getLineStart(content, selectionStart))
        return
      case '$':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(getLineEnd(content, selectionStart))
        return
      case 'w':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(moveToNextWordStart(content, selectionStart))
        return
      case 'b':
        event.preventDefault()
        preferredColumnRef.current = null
        setCursor(moveToPreviousWordStart(content, selectionStart))
        return
      default:
        event.preventDefault()
    }
  }

  return (
    <main className="editor-page">
      <header className="toolbar">
        <div className="title-wrap">
          <h1>Simple Text Editor</h1>
          <p className="filename">Current file: {fileName}</p>
          <p className={`mode mode-${mode.toLowerCase()}`}>Mode: {mode}</p>
        </div>
        <div className="controls">
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
          />
          <button type="button" onClick={handleOpenClick}>
            Open .txt
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={content.length === 0}
          >
            Download .txt
          </button>
        </div>
      </header>

      <textarea
        ref={textAreaRef}
        className={`editor ${
          mode === EditorMode.NORMAL ? 'editor-normal' : 'editor-insert'
        }`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleEditorKeyDown}
        onSelect={handleEditorSelect}
        placeholder="Start typing or open a .txt file..."
        spellCheck={false}
        readOnly={mode === EditorMode.NORMAL}
      />
      <p className="vim-help">
        <strong>Vim keys:</strong> <code>Esc</code> normal mode, <code>i</code>{' '}
        insert mode, <code>h j k l</code> move, <code>w</code>/<code>b</code> by
        word, <code>0</code>/<code>$</code> line start/end.
      </p>
    </main>
  )
}

export default App
