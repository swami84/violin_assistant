export interface SheetEvent {
  type: 'note' | 'rest'
  pitch?: string        // e.g. "D4"  (undefined for rest)
  duration_beats: number
}

export interface Measure {
  measure: number
  events: SheetEvent[]
}

export interface Lesson {
  title: string
  time_signature: '2/4' | '4/4'
  tempo_bpm: number
  measures: Measure[]
}

export interface ExpectedNote {
  pitch: string | null   // null = rest
  start_sec: number
  duration_sec: number
}

export interface DetectedNote {
  pitch: string
  freq_hz: number
  start_sec: number
  duration_sec: number
}

export type NoteResult = 'correct' | 'wrong_pitch' | 'onset_late' | 'onset_early' | 'short_duration' | 'missed' | 'extra' | 'rest'

export interface NoteComparison {
  expected: ExpectedNote
  detected: DetectedNote | null
  result: NoteResult
  pitchError?: string
  timingErrorSec?: number
  durationRatio?: number
}
