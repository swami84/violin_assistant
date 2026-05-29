import type { NoteComparison } from '../types'
import { summarize } from '../utils/comparison'

interface Props {
  comparisons: NoteComparison[]
}

const RESULT_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  correct:        { label: 'Correct',          bg: 'bg-green-100',  text: 'text-green-800' },
  wrong_pitch:    { label: 'Wrong Pitch',      bg: 'bg-red-100',    text: 'text-red-800' },
  onset_late:     { label: 'Too Late',         bg: 'bg-yellow-100', text: 'text-yellow-800' },
  onset_early:    { label: 'Too Early',        bg: 'bg-yellow-100', text: 'text-yellow-800' },
  short_duration: { label: 'Too Short',        bg: 'bg-orange-100', text: 'text-orange-800' },
  missed:         { label: 'Missed',           bg: 'bg-gray-100',   text: 'text-gray-600' },
  extra:          { label: 'Extra Note',       bg: 'bg-purple-100', text: 'text-purple-800' },
  rest:           { label: 'Rest',             bg: 'bg-blue-50',    text: 'text-blue-600' },
}

export default function FeedbackDisplay({ comparisons }: Props) {
  const stats = summarize(comparisons)
  const noteComps = comparisons.filter(c => c.result !== 'rest')

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Accuracy" value={`${stats.accuracy}%`} color="text-green-700" />
        <Stat label="Correct" value={stats.correct} color="text-green-700" />
        <Stat label="Missed" value={stats.missed} color="text-gray-600" />
        <Stat label="Wrong Pitch" value={stats.wrongPitch} color="text-red-700" />
      </div>

      {/* Per-note breakdown */}
      <div className="space-y-2">
        {noteComps.map((comp, i) => {
          const style = RESULT_LABELS[comp.result] ?? RESULT_LABELS.missed
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${style.bg}`}>
              <span className={`font-mono font-semibold w-8 ${style.text}`}>
                {comp.expected.pitch ?? '—'}
              </span>
              <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
              {comp.pitchError && (
                <span className="text-sm text-red-600 ml-auto">{comp.pitchError}</span>
              )}
              {comp.timingErrorSec !== undefined && Math.abs(comp.timingErrorSec) > 0.05 && (
                <span className="text-sm text-yellow-700 ml-auto">
                  {comp.timingErrorSec > 0 ? '+' : ''}{comp.timingErrorSec.toFixed(2)}s
                </span>
              )}
              {comp.durationRatio !== undefined && (
                <span className="text-sm text-orange-700 ml-auto">
                  hold longer ({Math.round(comp.durationRatio * 100)}% short)
                </span>
              )}
              {comp.detected && (
                <span className="text-xs text-gray-500 ml-auto">
                  detected: {comp.detected.pitch} @ {comp.detected.start_sec.toFixed(2)}s
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
