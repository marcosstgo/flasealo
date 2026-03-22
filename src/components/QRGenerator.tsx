import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Share2 } from 'lucide-react'

interface QRGeneratorProps {
  eventSlug: string
  eventName: string
}

export function QRGenerator({ eventSlug, eventName }: QRGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const uploadUrl = `${window.location.origin}/upload/${eventSlug}`

  useEffect(() => {
    generateQRCode()
  }, [uploadUrl])

  const generateQRCode = async () => {
    setIsGenerating(true)
    try {
      const url = await QRCode.toDataURL(uploadUrl, {
        width: 512,
        margin: 2,
        color: { dark: '#111111', light: '#FFFFFF' },
      })
      setQrCodeUrl(url)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.download = `flashealo-${eventSlug}-qr.png`
    link.href = qrCodeUrl
    link.click()
  }

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, url: uploadUrl })
      } catch {}
    } else {
      await navigator.clipboard.writeText(uploadUrl)
    }
  }

  return (
    <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm">
      <h3 className="font-medium dark:text-white text-gray-900 mb-1">Código QR</h3>
      <p className="dark:text-white/40 text-gray-500 text-xs mb-4">Los invitados escanean esto para subir fotos</p>

      {isGenerating ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 dark:border-white/40 border-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-xl shadow-inner">
              <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
            </div>
          </div>

          <p className="text-center dark:text-white/20 text-gray-400 text-xs font-mono break-all px-2">
            {uploadUrl}
          </p>

          <div className="flex gap-2">
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 dark:border dark:border-white/15 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 text-xs py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            <button
              onClick={shareQR}
              className="flex-1 flex items-center justify-center gap-2 dark:border dark:border-white/15 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 text-xs py-2 rounded-xl transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
