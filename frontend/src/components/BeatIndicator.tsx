import { useEffect, useRef, useState } from 'react'

interface Props {
  bpm: number
  timeSignature: string  // e.g. "4/4" or "2/4"
  active: boolean
}

export default function BeatIndicator({ bpm, timeSignature, active }: Props) {
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0])
  const [currentBeat, setCurrentBeat] = useState(-1)  // -1 = not started
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setCurrentBeat(-1)
      return
    }

    // fire immediately on beat 0, then tick every beat
    let beat = 0
    setCurrentBeat(0)
    intervalRef.current = setInterval(() => {
      beat = (beat + 1) % beatsPerMeasure
      setCurrentBeat(beat)
    }, (60 / bpm) * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, bpm, beatsPerMeasure])

  const msPerBeat = Math.round((60 / bpm) * 1000)

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: beatsPerMeasure }, (_, i) => {
          const isActive = currentBeat === i
          const isDownbeat = i === 0
          return (
            <div
              key={i}
              className="relative flex items-center justify-center"
              style={{ width: 36, height: 36 }}
            >
              {/* pulse ring on active beat */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-60"
                  style={{
                    backgroundColor: isDownbeat ? '#dc2626' : '#3b82f6',
                    animationDuration: `${msPerBeat}ms`
                  }}
                />
              )}
              <span
                className="relative rounded-full transition-all duration-75 flex items-center justify-center text-xs font-bold text-white"
                style={{
                  width: isActive ? 36 : 28,
                  height: isActive ? 36 : 28,
                  backgroundColor: isActive
                    ? (isDownbeat ? '#dc2626' : '#3b82f6')
                    : '#d1d5db'
                }}
              >
                {i + 1}
              </span>
            </div>
          )
        })}
      </div>

      <span className="text-sm text-gray-400">{bpm} BPM</span>
    </div>
  )
}
