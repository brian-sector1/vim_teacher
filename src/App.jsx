import { useRef, useState } from 'react'
import './App.css'

function App() {
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('untitled.txt')
  const fileInputRef = useRef(null)

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

  return (
    <main className="editor-page">
      <header className="toolbar">
        <div className="title-wrap">
          <h1>Simple Text Editor</h1>
          <p className="filename">Current file: {fileName}</p>
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
        className="editor"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start typing or open a .txt file..."
        spellCheck={false}
      />
    </main>
  )
}

export default App
