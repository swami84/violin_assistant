import { useState, useRef } from 'react'

interface Props {
  onRecordingComplete: (blob: Blob) => void
  onRecordingStart?: () => void
  disabled?: boolean
}

export default function Recorder({ onRecordingComplete, onRecordingStart, disabled }: Props) {
  const [recording, setRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mr
    chunksRef.current = []

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      onRecordingComplete(blob)
      setHasRecording(true)
      stream.getTracks().forEach(t => t.stop())
    }

    mr.start()
    setRecording(true)
    setHasRecording(false)
    onRecordingStart?.()
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="flex items-center gap-4">
      {!recording ? (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-full flex items-center gap-2 transition-colors"
        >
          <span className="w-3 h-3 rounded-full bg-white inline-block" />
          Record
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-full flex items-center gap-2 animate-pulse transition-colors"
        >
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Stop
        </button>
      )}
      {hasRecording && !recording && (
        <span className="text-sm text-gray-500">Recording captured — analyzing...</span>
      )}
    </div>
  )
}
