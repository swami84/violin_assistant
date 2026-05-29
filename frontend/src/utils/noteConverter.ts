import type { Lesson, ExpectedNote } from '../types'

export function lessonToTimeline(lesson: Lesson): ExpectedNote[] {
  const secPerBeat = 60 / lesson.tempo_bpm
  const notes: ExpectedNote[] = []
  let currentSec = 0

  for (const measure of lesson.measures) {
    for (const event of measure.events) {
      const duration_sec = event.duration_beats * secPerBeat
      notes.push({
        pitch: event.type === 'rest' ? null : (event.pitch ?? null),
        start_sec: currentSec,
        duration_sec
      })
      currentSec += duration_sec
    }
  }

  return notes
}
