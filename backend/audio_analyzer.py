import subprocess
import numpy as np
import librosa

PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
SR = 22050

def midi_to_note_name(midi_num: int) -> str:
    octave = (midi_num // 12) - 1
    name = PITCH_NAMES[midi_num % 12]
    return f"{name}{octave}"

def decode_audio(audio_bytes: bytes) -> np.ndarray:
    """Use ffmpeg to decode any browser audio format (webm, ogg, mp4) to mono float32."""
    cmd = [
        'ffmpeg', '-i', 'pipe:0',
        '-f', 'f32le',
        '-ar', str(SR),
        '-ac', '1',
        '-loglevel', 'error',
        'pipe:1'
    ]
    result = subprocess.run(cmd, input=audio_bytes, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg decode failed: {result.stderr.decode()}")
    return np.frombuffer(result.stdout, dtype=np.float32)

def merge_onsets(onset_times: np.ndarray, min_gap: float) -> np.ndarray:
    """Drop onsets that are too close to the previous one."""
    if len(onset_times) == 0:
        return onset_times
    kept = [onset_times[0]]
    for t in onset_times[1:]:
        if t - kept[-1] >= min_gap:
            kept.append(t)
    return np.array(kept)

def analyze_audio(audio_bytes: bytes, tempo_bpm: float = 60.0) -> list[dict]:
    """Return list of detected notes: [{pitch, start_sec, duration_sec}]"""
    y = decode_audio(audio_bytes)
    if len(y) == 0:
        return []

    # Minimum gap = 40% of a beat. Prevents vibrato/bow changes within a note
    # from registering as separate onsets, while still separating real notes.
    min_gap = (60.0 / tempo_bpm) * 0.4

    onset_frames = librosa.onset.onset_detect(
        y=y, sr=SR, units='frames', backtrack=True,
        delta=0.07, wait=int(min_gap * SR / 512)
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=SR)
    onset_times = merge_onsets(onset_times, min_gap)

    # fmin=G3: lowest open violin string. Anything below is mic/bow noise.
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz('G3'),
        fmax=librosa.note_to_hz('C6'),
        sr=SR
    )
    times = librosa.times_like(f0, sr=SR)

    notes = []
    for i, onset in enumerate(onset_times):
        end = onset_times[i + 1] if i + 1 < len(onset_times) else times[-1]

        mask = (times >= onset) & (times < end) & voiced_flag
        valid = f0[mask]
        valid = valid[~np.isnan(valid)]

        if len(valid) < 5:  # skip brief noise (bow touch, string squeak)
            continue

        freq_hz = float(np.median(valid))
        midi_num = int(round(librosa.hz_to_midi(freq_hz)))
        notes.append({
            "pitch": midi_to_note_name(midi_num),
            "freq_hz": round(freq_hz, 2),
            "start_sec": round(float(onset), 3),
            "duration_sec": round(float(end - onset), 3)
        })

    return notes
