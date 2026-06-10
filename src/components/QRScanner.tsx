'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface QRScannerProps {
  onClose: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Html5QrcodeInstance = any

export default function QRScanner({ onClose }: QRScannerProps) {
  const router = useRouter()
  const scannerRef = useRef<Html5QrcodeInstance>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let html5QrCode: Html5QrcodeInstance = null

    const startScanner = async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            try {
              const url = new URL(decodedText)
              const match = url.pathname.match(/\/assign\/(.+)$/)
              if (match) {
                setScanning(false)
                html5QrCode.stop().catch(() => {})
                const civilization = decodeURIComponent(match[1])
                router.push(`/assign/${encodeURIComponent(civilization)}`)
                onClose()
              } else {
                setError('このQRコードはビンゴカード用ではありません')
              }
            } catch {
              setError('QRコードを読み取れませんでした')
            }
          },
          () => {}
        )
      } catch {
        setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。')
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [router, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      {/* ヘッダー */}
      <div className="w-full max-w-sm flex justify-between items-center mb-4">
        <h2 className="text-white font-bold text-lg">📷 QRコードをスキャン</h2>
        <button
          onClick={() => {
            if (scannerRef.current) {
              scannerRef.current.stop().catch(() => {})
            }
            onClose()
          }}
          className="text-white text-2xl leading-none px-2"
        >
          ✕
        </button>
      </div>

      {/* カメラビュー */}
      <div className="w-full max-w-sm">
        <div
          id="qr-reader"
          className="w-full rounded-xl overflow-hidden"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* 説明文 */}
      {scanning && !error && (
        <p className="text-gray-300 text-sm mt-4 text-center">
          QRコードを枠内に合わせてください
        </p>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3 max-w-sm w-full">
          <p className="text-red-300 text-sm text-center">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 w-full text-white text-sm underline"
          >
            もう一度試す
          </button>
        </div>
      )}
    </div>
  )
}
