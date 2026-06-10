'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface QRScannerProps {
  onClose: () => void
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  const stopAll = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const handleClose = useCallback(() => {
    stopAll()
    onClose()
  }, [stopAll, onClose])

  useEffect(() => {
    let active = true

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        scan()
      } catch {
        setError('カメラを起動できませんでした。\nカメラへのアクセスを許可してください。')
      }
    }

    const scan = async () => {
      if (!active || !videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scan)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // jsqrを動的インポート
      const jsQR = (await import('jsqr')).default
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        try {
          const url = new URL(code.data)
          const match = url.pathname.match(/\/assign\/(.+)$/)
          if (match) {
            if (!active) return
            setDetected(true)
            stopAll()
            const civ = decodeURIComponent(match[1])
            router.push(`/assign/${encodeURIComponent(civ)}`)
            onClose()
            return
          }
        } catch { /* not a URL */ }
      }

      animFrameRef.current = requestAnimationFrame(scan)
    }

    start()
    return () => {
      active = false
      stopAll()
    }
  }, [router, onClose, stopAll])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-3 bg-black/80">
        <h2 className="text-white font-bold text-lg">📷 QRコードをスキャン</h2>
        <button onClick={handleClose} className="text-white text-3xl leading-none w-10 h-10 flex items-center justify-center">
          ✕
        </button>
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* スキャン枠 */}
        {!error && !detected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-60 h-60">
              {/* 四隅 */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
            </div>
          </div>
        )}

        {/* 検出成功 */}
        {detected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-white text-center">
              <div className="text-5xl mb-2">✅</div>
              <p className="font-bold">読み取り成功！</p>
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📵</div>
              <p className="text-white text-sm whitespace-pre-line mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      {!error && !detected && (
        <div className="bg-black/80 py-3 text-center">
          <p className="text-gray-300 text-sm">QRコードを枠内に合わせてください</p>
        </div>
      )}
    </div>
  )
}
