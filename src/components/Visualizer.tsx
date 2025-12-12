import React, { useRef, useEffect, useState } from 'react'

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fftSize, setFftSize] = useState(2048)

  useEffect(() => {
    let audioCtx: AudioContext | null = null
    let raf = 0

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas.width = canvas.clientWidth * devicePixelRatio
      canvas.height = canvas.clientHeight * devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)

    async function setupAnalyser() {
      if (!audioRef.current) return
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaElementSource(audioRef.current)
      const a = audioCtx.createAnalyser()
      a.fftSize = fftSize
      a.smoothingTimeConstant = 0.85
      source.connect(a)
      a.connect(audioCtx.destination)
      setAnalyser(a)
      draw(a)
    }

    function draw(a: AnalyserNode) {
      const bufferLength = a.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)
      // background CRT + scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, width, height)

      a.getByteFrequencyData(dataArray)
      const barWidth = (width / bufferLength) * 2.5

      // Frequency heat map
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255
        const hue = 180 - Math.floor(v * 180)
        ctx.fillStyle = `hsl(${hue}, 100%, ${20 + v * 50}%)`
        const x = i * barWidth
        ctx.fillRect(x, height - v * height, barWidth - 1, v * height)
      }

      // Oscilloscope overlay (simulate)
      a.getByteTimeDomainData(dataArray)
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)'
      ctx.beginPath()
      const sliceWidth = width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()

      // subtle scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      for (let i = 0; i < height; i += 3) {
        ctx.fillRect(0, i, width, 1)
      }

      raf = requestAnimationFrame(() => draw(a))
    }

    setupAnalyser().catch(() => {})
    return () => {
      window.removeEventListener('resize', resize)
      if (raf) cancelAnimationFrame(raf)
      if (audioCtx) audioCtx.close()
    }
  }, [fftSize])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (!audioRef.current) return
    audioRef.current.src = url
    audioRef.current.load()
    setIsPlaying(false)
  }

  async function togglePlay() {
    if (!audioRef.current) return
    if (!analyser) {
      try {
        // resume audio context on user gesture
        await (audioRef.current as any).play().then(() => {
          setIsPlaying(true)
        })
      } catch (err) {
        // fallback
        audioRef.current.play()
        setIsPlaying(true)
      }
      return
    }

    if (audioRef.current.paused) {
      await audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="rounded-lg border border-cyan-700 p-4 neon-panel">
      <div className="flex items-center gap-4 mb-3">
        <input type="file" accept="audio/*" onChange={onFile} className="text-sm" />
        <button
          onClick={togglePlay}
          className="px-3 py-1 bg-cyan-700/30 border border-cyan-600 rounded hover:bg-cyan-700/50"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <label className="flex items-center gap-2 ml-auto text-sm">
          FFT Size
          <select
            value={fftSize}
            onChange={(e) => setFftSize(parseInt(e.target.value))}
            className="bg-transparent border border-cyan-700 px-2 rounded"
          >
            <option value={512}>512</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
          </select>
        </label>
      </div>

      <div className="w-full h-96 bg-black rounded overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <audio ref={audioRef} hidden controls />
      </div>
    </div>
  )
}
