import { useEffect, useRef } from 'react'
import { Renderer, Stave, Voice, Formatter, StaveNote, Accidental } from 'vexflow'
import type { Lesson, NoteComparison } from '../types'

interface Props {
  lesson: Lesson
  comparisons?: NoteComparison[]
}

// Map duration_beats to VexFlow duration string
function beatsToVexDuration(beats: number): string {
  if (beats >= 4) return 'w'
  if (beats >= 2) return 'h'
  return 'q'
}

// Parse pitch like "D4" -> keys: ["d/4"], accidentals: []
function parsePitch(pitch: string): { keys: string[]; accidental?: string } {
  const match = pitch.match(/^([A-G])(#|b)?(\d)$/)
  if (!match) return { keys: ['b/4'] }
  const [, name, acc, octave] = match
  const key = `${name.toLowerCase()}${acc === '#' ? '#' : acc === 'b' ? 'b' : ''}/${octave}`
  return { keys: [key], accidental: acc || undefined }
}

function resultToColor(result?: string): string {
  switch (result) {
    case 'correct':        return '#16a34a'
    case 'wrong_pitch':    return '#dc2626'
    case 'onset_late':
    case 'onset_early':    return '#ca8a04'
    case 'short_duration': return '#ea580c'
    case 'missed':         return '#9ca3af'
    default:               return '#1f2937'
  }
}

export default function SheetMusic({ lesson, comparisons }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const measures = lesson.measures
    const [beatsPerMeasure] = lesson.time_signature.split('/').map(Number)

    const containerWidth = containerRef.current.offsetWidth - 24
    const CLEF_OFFSET = 90  // px reserved for clef (+ time sig on row 0) on first measure of each row
    const MIN_STAVE_WIDTH = 180
    const measuresPerRow = Math.max(1, Math.floor((containerWidth - CLEF_OFFSET) / MIN_STAVE_WIDTH))
    // each regular measure gets staveWidth; first-in-row gets staveWidth + CLEF_OFFSET
    const staveWidth = Math.floor((containerWidth - CLEF_OFFSET) / measuresPerRow)
    const ROW_HEIGHT = 120
    const rowCount = Math.ceil(measures.length / measuresPerRow)
    const totalHeight = rowCount * ROW_HEIGHT + 20

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
    renderer.resize(containerWidth, totalHeight)
    const context = renderer.getContext()
    context.setFont('Arial', 10)

    let globalEventIdx = 0

    for (let mi = 0; mi < measures.length; mi++) {
      const measure = measures[mi]
      const row = Math.floor(mi / measuresPerRow)
      const col = mi % measuresPerRow
      const isFirstInRow = col === 0
      const isFirstMeasure = mi === 0

      // col 0: x=0, width=staveWidth+CLEF_OFFSET; col n: x=n*staveWidth+CLEF_OFFSET, width=staveWidth
      const x = col === 0 ? 0 : col * staveWidth + CLEF_OFFSET
      const staveY = row * ROW_HEIGHT + 30
      const width = isFirstInRow ? staveWidth + CLEF_OFFSET : staveWidth

      const stave = new Stave(x, staveY, width)

      if (isFirstInRow) {
        stave.addClef('treble')
        if (isFirstMeasure) {
          const [beats, noteVal] = lesson.time_signature.split('/').map(Number)
          stave.addTimeSignature(`${beats}/${noteVal}`)
        }
      }

      stave.setContext(context).draw()

      const vexNotes: StaveNote[] = []

      for (const event of measure.events) {
        const dur = beatsToVexDuration(event.duration_beats)
        const compResult = comparisons ? comparisons[globalEventIdx]?.result : undefined
        const color = comparisons ? resultToColor(compResult) : '#1f2937'

        let note: StaveNote
        if (event.type === 'rest') {
          note = new StaveNote({ keys: ['b/4'], duration: `${dur}r` })
        } else {
          const pitch = event.pitch ?? 'B4'
          const { keys, accidental } = parsePitch(pitch)
          note = new StaveNote({ keys, duration: dur })
          if (accidental) {
            note.addModifier(new Accidental(accidental === '#' ? '#' : 'b'), 0)
          }
        }

        note.setStyle({ fillStyle: color, strokeStyle: color })
        vexNotes.push(note)
        globalEventIdx++
      }

      const voice = new Voice({ num_beats: beatsPerMeasure, beat_value: 4 })
      voice.setStrict(false)
      voice.addTickables(vexNotes)

      const formatWidth = (isFirstInRow ? staveWidth + CLEF_OFFSET : staveWidth) - 30
      new Formatter().joinVoices([voice]).format([voice], formatWidth)
      voice.draw(context, stave)
    }
  }, [lesson, comparisons])

  return (
    <div
      ref={containerRef}
      className="w-full bg-white rounded-lg border border-gray-200 p-2"
    />
  )
}
