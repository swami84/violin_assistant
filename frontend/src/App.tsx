import { useState, useCallback } from 'react'
import SheetMusic from './components/SheetMusic'
import Recorder from './components/Recorder'
import BeatIndicator from './components/BeatIndicator'
import FeedbackDisplay from './components/FeedbackDisplay'
import type { Lesson, DetectedNote, NoteComparison } from './types'
import { lessonToTimeline } from './utils/noteConverter'
import { compareNotes } from './utils/comparison'

const DEFAULT_LESSON: Lesson = {
  title: "Lesson 1 — Open D",
  time_signature: "4/4",
  tempo_bpm: 60,
  measures: [
    {
      measure: 1,
      events: [
        { type: "note", pitch: "D4", duration_beats: 1 },
        { type: "note", pitch: "D4", duration_beats: 1 },
        { type: "note", pitch: "D4", duration_beats: 1 },
        { type: "note", pitch: "D4", duration_beats: 1 }
      ]
    },
    {
      measure: 2,
      events: [
        { type: "note", pitch: "D4", duration_beats: 2 },
        { type: "rest", duration_beats: 2 }
      ]
    }
  ]
}

type AppState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

export default function App() {
  const [lesson, setLesson] = useState<Lesson>(DEFAULT_LESSON)
  const [state, setState] = useState<AppState>('idle')
  const [comparisons, setComparisons] = useState<NoteComparison[] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  function loadLesson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        setLesson(parsed)
        setComparisons(null)
        setState('idle')
      } catch {
        setErrorMsg('Invalid JSON file')
        setState('error')
      }
    }
    reader.readAsText(file)
  }

  const handleRecordingStart = useCallback(() => {
    setState('recording')
  }, [])

  const handleRecording = useCallback(async (blob: Blob) => {
    setState('analyzing')
    setComparisons(null)
    setErrorMsg('')

    try {
      const form = new FormData()
      form.append('file', blob, 'recording.webm')
      form.append('tempo_bpm', String(lesson.tempo_bpm))

      const res = await fetch('/api/analyze', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      const detected: DetectedNote[] = data.notes

      const expected = lessonToTimeline(lesson)
      const result = compareNotes(expected, detected)
      setComparisons(result)
      setState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }, [lesson])

  function reset() {
    setComparisons(null)
    setState('idle')
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Violin Rhythm Trainer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record your playing and get instant feedback</p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Lesson loader */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{lesson.title}</h2>
              <p className="text-sm text-gray-500">
                {lesson.time_signature} · {lesson.tempo_bpm} BPM · {lesson.measures.length} measures
              </p>
            </div>
            <label className="cursor-pointer px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors">
              Load JSON
              <input type="file" accept=".json" className="hidden" onChange={loadLesson} />
            </label>
          </div>

          <SheetMusic lesson={lesson} comparisons={comparisons ?? undefined} />
        </section>

        {/* Recording controls */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Record Your Performance</h2>
          <div className="flex items-center gap-4 mb-4">
            <Recorder
              onRecordingStart={handleRecordingStart}
              onRecordingComplete={handleRecording}
              disabled={state === 'analyzing'}
            />
          </div>
          <BeatIndicator
            bpm={lesson.tempo_bpm}
            timeSignature={lesson.time_signature}
            active={state === 'recording'}
          />
          {state === 'analyzing' && (
            <p className="text-sm text-blue-600 animate-pulse mt-3">Analyzing audio...</p>
          )}
          {state === 'done' && (
            <button onClick={reset} className="mt-3 text-sm text-gray-500 underline hover:text-gray-700">
              Record again
            </button>
          )}
          {state === 'error' && (
            <p className="mt-3 text-sm text-red-600">Error: {errorMsg}</p>
          )}
        </section>

        {/* Feedback */}
        {comparisons && comparisons.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Feedback</h2>
            <FeedbackDisplay comparisons={comparisons} />
          </section>
        )}
      </main>
    </div>
  )
}
