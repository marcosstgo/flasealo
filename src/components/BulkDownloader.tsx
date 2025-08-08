import React, { useState } from 'react'
import { Download, Archive, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { supabase } from '../lib/supabase'

interface BulkDownloaderProps {
  eventId: string
  eventName: string
  eventSlug: string
}

interface DownloadProgress {
  current: number
  total: number
  status: 'idle' | 'downloading' | 'zipping' | 'complete' | 'error'
  errorMessage?: string
}

export function BulkDownloader({ eventId, eventName, eventSlug }: BulkDownloaderProps) {
  const [progress, setProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
    status: 'idle'
  })

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('event-photos')
      .getPublicUrl(imagePath)
    return data.publicUrl
  }

  const downloadAllPhotos = async () => {
    try {
      setProgress({ current: 0, total: 0, status: 'downloading' })

      // Fetch all approved photos for the event
      const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })

      if (error) throw error

      if (!photos || photos.length === 0) {
        setProgress({
          current: 0,
          total: 0,
          status: 'error',
          errorMessage: 'No hay fotos aprobadas para descargar'
        })
        return
      }

      setProgress({ current: 0, total: photos.length, status: 'downloading' })

      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Download each photo and add to zip
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        setProgress(prev => ({ ...prev, current: i + 1 }))

        try {
          const imageUrl = getImageUrl(photo.image_path)
          const response = await fetch(imageUrl)
          
          if (!response.ok) {
            console.warn(`Failed to download photo ${photo.id}`)
            continue
          }

          const blob = await response.blob()
          
          // Create a descriptive filename
          const date = new Date(photo.created_at).toISOString().split('T')[0]
          const uploaderName = photo.uploader_name ? 
            `_${photo.uploader_name.replace(/[^a-zA-Z0-9]/g, '-')}` : ''
          const extension = photo.format.split('/')[1] || 'jpg'
          const filename = `${date}_${i + 1}${uploaderName}.${extension}`

          zip.file(filename, blob)
        } catch (photoError) {
          console.warn(`Error downloading photo ${photo.id}:`, photoError)
          continue
        }
      }

      setProgress(prev => ({ ...prev, status: 'zipping' }))

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      // Download the ZIP file
      const url = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventSlug}_fotos_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setProgress(prev => ({ ...prev, status: 'complete' }))

      // Reset after 3 seconds
      setTimeout(() => {
        setProgress({ current: 0, total: 0, status: 'idle' })
      }, 3000)

    } catch (error: any) {
      console.error('Error downloading photos:', error)
      setProgress({
        current: 0,
        total: 0,
        status: 'error',
        errorMessage: error.message || 'Error al descargar las fotos'
      })

      // Reset after 5 seconds
      setTimeout(() => {
        setProgress({ current: 0, total: 0, status: 'idle' })
      }, 5000)
    }
  }

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'downloading':
        return `Descargando fotos... ${progress.current}/${progress.total}`
      case 'zipping':
        return 'Comprimiendo archivo...'
      case 'complete':
        return '¡Descarga completada!'
      case 'error':
        return progress.errorMessage || 'Error en la descarga'
      default:
        return ''
    }
  }

  const getProgressPercentage = () => {
    if (progress.total === 0) return 0
    return Math.round((progress.current / progress.total) * 100)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Archive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Descarga Masiva
              </h3>
              <p className="text-sm text-gray-600">
                Descarga todas las fotos aprobadas en un archivo ZIP
              </p>
            </div>
          </div>
          
          <Button
            onClick={downloadAllPhotos}
            disabled={progress.status !== 'idle'}
            isLoading={progress.status === 'downloading' || progress.status === 'zipping'}
            className="flex items-center space-x-2"
          >
            {progress.status === 'idle' && (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Todas</span>
              </>
            )}
            {progress.status === 'downloading' && (
              <>
                <Download className="w-4 h-4" />
                <span>Descargando...</span>
              </>
            )}
            {progress.status === 'zipping' && (
              <>
                <Archive className="w-4 h-4" />
                <span>Comprimiendo...</span>
              </>
            )}
            {progress.status === 'complete' && (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Completado</span>
              </>
            )}
            {progress.status === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Error</span>
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {(progress.status === 'downloading' || progress.status === 'zipping') && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{getStatusMessage()}</span>
              {progress.status === 'downloading' && (
                <span>{getProgressPercentage()}%</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: progress.status === 'downloading' 
                    ? `${getProgressPercentage()}%` 
                    : '100%' 
                }}
              />
            </div>
          </div>
        )}

        {/* Status Messages */}
        {progress.status === 'complete' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 text-sm">
                ¡Descarga completada! El archivo ZIP se ha guardado en tu carpeta de descargas.
              </p>
            </div>
          </div>
        )}

        {progress.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm">
                {progress.errorMessage}
              </p>
            </div>
          </div>
        )}

        {progress.status === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <strong>Incluye:</strong> Todas las fotos aprobadas del evento con nombres descriptivos 
              que incluyen fecha, número secuencial y nombre del colaborador.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}