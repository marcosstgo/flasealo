import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Share2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader } from './ui/Card'

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
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
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
        await navigator.share({
          title: `QR Code for ${eventName}`,
          text: `Scan this QR code to upload photos to ${eventName}`,
          url: uploadUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(uploadUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
        <p className="text-sm text-gray-600">
          Share this QR code for guests to upload photos
        </p>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {isGenerating ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            <div className="inline-block p-4 bg-white rounded-xl shadow-inner">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div className="text-xs text-gray-500 font-mono break-all">
              {uploadUrl}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQR}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareQR}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}