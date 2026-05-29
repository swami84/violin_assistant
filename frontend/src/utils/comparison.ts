import type { ExpectedNote, DetectedNote, NoteComparison, NoteResult } from '../types'

const TIMING_TOLERANCE_SEC = 0.15
const DURATION_TOLERANCE_RATIO = 0.50

// Convert note name to MIDI number for enharmonic comparison
function noteToMidi(note: string): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  }
  const match = note.match(/^([A-G]#?b?)(\d)$/)
  if (!match) return -1
  const [, name, octave] = match
  return (parseInt(octave) + 1) * 12 + (noteMap[name] ?? 0)
}

function pitchesMatch(a: string, b: string): boolean {
  return noteToMidi(a) === noteToMidi(b)
}

export function compareNotes(
  expected: ExpectedNote[],
  detected: DetectedNote[]
): NoteComparison[] {
  // Shift detected times so the first note starts at t=0, removing record-button delay
  const offset = detected.length > 0 ? detected[0].start_sec : 0
  const shifted = detected.map(n => ({ ...n, start_sec: n.start_sec - offset }))

  const results: NoteComparison[] = []
  const usedDetected = new Set<number>()

  for (const exp of expected) {
    if (exp.pitch === null) {
      // rest — just record it
      results.push({ expected: exp, detected: null, result: 'rest' })
      continue
    }

    // find closest detected note by start time
    let bestIdx = -1
    let bestDelta = Infinity

    for (let i = 0; i < shifted.length; i++) {
      if (usedDetected.has(i)) continue
      const delta = Math.abs(shifted[i].start_sec - exp.start_sec)
      if (delta < bestDelta) {
        bestDelta = delta
        bestIdx = i
      }
    }

    if (bestIdx === -1 || bestDelta > TIMING_TOLERANCE_SEC * 3) {
      results.push({ expected: exp, detected: null, result: 'missed' })
      continue
    }

    usedDetected.add(bestIdx)
    const det = shifted[bestIdx]
    const timingErr = det.start_sec - exp.start_sec
    const durationRatio = Math.abs(det.duration_sec - exp.duration_sec) / exp.duration_sec

    let result: NoteResult
    if (!pitchesMatch(exp.pitch!, det.pitch)) {
      result = 'wrong_pitch'
    } else if (timingErr > TIMING_TOLERANCE_SEC) {
      result = 'onset_late'
    } else if (timingErr < -TIMING_TOLERANCE_SEC) {
      result = 'onset_early'
    } else if (durationRatio > DURATION_TOLERANCE_RATIO) {
      result = 'short_duration'
    } else {
      result = 'correct'
    }

    results.push({
      expected: exp,
      detected: det,
      result,
      pitchError: result === 'wrong_pitch' ? `Expected ${exp.pitch}, got ${det.pitch}` : undefined,
      timingErrorSec: result !== 'wrong_pitch' ? timingErr : undefined,
      durationRatio: result === 'short_duration' ? durationRatio : undefined
    })
  }

  // extra notes
  for (let i = 0; i < shifted.length; i++) {
    if (!usedDetected.has(i)) {
      results.push({
        expected: { pitch: null, start_sec: shifted[i].start_sec, duration_sec: shifted[i].duration_sec },
        detected: shifted[i],
        result: 'extra'
      })
    }
  }

  return results
}

export function summarize(comparisons: NoteComparison[]) {
  const realNotes = comparisons.filter(c => c.result !== 'rest' && c.result !== 'extra')
  const correct = comparisons.filter(c => c.result === 'correct').length
  const total = realNotes.length
  return {
    correct,
    total,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    missed: comparisons.filter(c => c.result === 'missed').length,
    wrongPitch: comparisons.filter(c => c.result === 'wrong_pitch').length,
    timingIssues: comparisons.filter(c => ['onset_late', 'onset_early', 'short_duration'].includes(c.result)).length,
    extra: comparisons.filter(c => c.result === 'extra').length
  }
}
