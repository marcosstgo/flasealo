import React, { useState } from 'react'
import { Download, Archive, AlertCircle, CheckCircle } from 'lucide-react'
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
  const [progress, setProgress] = useState<DownloadProgress>({ current: 0, total: 0, status: 'idle' })

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage.from('event-photos').getPublicUrl(imagePath)
    return data.publicUrl
  }

  const downloadAllPhotos = async () => {
    try {
      setProgress({ current: 0, total: 0, status: 'downloading' })

      const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })

      if (error) throw error

      if (!photos || photos.length === 0) {
        setProgress({ current: 0, total: 0, status: 'error', errorMessage: 'No hay fotos aprobadas para descargar' })
        setTimeout(() => setProgress({ current: 0, total: 0, status: 'idle' }), 4000)
        return
      }

      setProgress({ current: 0, total: photos.length, status: 'downloading' })

      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        setProgress(prev => ({ ...prev, current: i + 1 }))

        try {
          const response = await fetch(getImageUrl(photo.image_path))
          if (!response.ok) continue
          const blob = await response.blob()
          const date = new Date(photo.created_at).toISOString().split('T')[0]
          const uploaderSuffix = photo.uploader_name ? `_${photo.uploader_name.replace(/[^a-zA-Z0-9]/g, '-')}` : ''
          const ext = photo.format.split('/')[1] || 'jpg'
          zip.file(`${date}_${i + 1}${uploaderSuffix}.${ext}`, blob)
        } catch {
          continue
        }
      }

      setProgress(prev => ({ ...prev, status: 'zipping' }))

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })

      const url = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventSlug}_fotos_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setProgress(prev => ({ ...prev, status: 'complete' }))
      setTimeout(() => setProgress({ current: 0, total: 0, status: 'idle' }), 3000)

    } catch (error: any) {
      setProgress({ current: 0, total: 0, status: 'error', errorMessage: error.message || 'Error al descargar las fotos' })
      setTimeout(() => setProgress({ current: 0, total: 0, status: 'idle' }), 5000)
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const isActive = progress.status === 'downloading' || progress.status === 'zipping'

  return (
    <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 dark:bg-white/10 bg-gray-100 rounded-lg">
            <Archive className="w-4 h-4 dark:text-white/50 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Descarga masiva</p>
            <p className="text-xs dark:text-white/30 text-gray-400">Todas las fotos aprobadas en ZIP</p>
          </div>
        </div>

        <button
          onClick={downloadAllPhotos}
          disabled={isActive}
          className={`flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50 ${
            progress.status === 'complete'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : progress.status === 'error'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'dark:bg-white dark:text-black bg-gray-900 text-white hover:opacity-90'
          }`}
        >
          {progress.status === 'idle' && <><Download className="w-3.5 h-3.5" /> Descargar</>}
          {progress.status === 'downloading' && <><Download className="w-3.5 h-3.5" /> {pct}%</>}
          {progress.status === 'zipping' && <><Archive className="w-3.5 h-3.5" /> Comprimiendo...</>}
          {progress.status === 'complete' && <><CheckCircle className="w-3.5 h-3.5" /> Listo</>}
          {progress.status === 'error' && <><AlertCircle className="w-3.5 h-3.5" /> Error</>}
        </button>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs dark:text-white/30 text-gray-400">
            <span>{progress.status === 'downloading' ? `Descargando ${progress.current}/${progress.total}` : 'Comprimiendo...'}</span>
            {progress.status === 'downloading' && <span>{pct}%</span>}
          </div>
          <div className="w-full dark:bg-white/10 bg-gray-200 rounded-full h-1.5">
            <div
              className="dark:bg-white bg-gray-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: progress.status === 'downloading' ? `${pct}%` : '100%' }}
            />
          </div>
        </div>
      )}

      {progress.status === 'complete' && (
        <p className="text-xs text-green-400 mt-2">
          Archivo ZIP guardado en tu carpeta de descargas.
        </p>
      )}

      {progress.status === 'error' && (
        <p className="text-xs text-red-400 mt-2">{progress.errorMessage}</p>
      )}
    </div>
  )
}
