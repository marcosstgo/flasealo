import React, { useState, useRef, useEffect } from 'react'
import { Camera, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface PhotoUploaderProps {
  eventId: string
  eventSlug: string
  eventName: string
  autoApprove?: boolean
}

interface UploadedFile {
  file: File
  preview: string
  id: string
  status: 'uploading' | 'success' | 'error'
  errorMessage?: string
}

interface UploadLimits {
  allowed: boolean
  reason?: string
  message?: string
  uploads_in_window?: number
  total_uploads?: number
  rate_limit?: number
  total_limit?: number
  retry_after_seconds?: number
}

export function PhotoUploader({ eventId, eventSlug, eventName, autoApprove = false }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploaderName, setUploaderName] = useState('')
  const [hasConsented, setHasConsented] = useState(false)
  const [step, setStep] = useState<'identity' | 'upload'>('identity')
  const [uploadLimits, setUploadLimits] = useState<UploadLimits | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const successCount = files.filter(f => f.status === 'success').length
  const hasErrors = files.some(f => f.status === 'error')

  useEffect(() => {
    if (step === 'upload' && uploaderName) {
      checkUploadLimits()
    }
  }, [step, uploaderName, successCount])

  const checkUploadLimits = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            uploaderName: uploaderName.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setLimitError(data.message || 'No puedes subir más fotos en este momento')
        setUploadLimits(data)
      } else {
        setLimitError(null)
        setUploadLimits(data)
      }
    } catch (error) {
      console.error('Error checking limits:', error)
    }
  }

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('MD5', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    if (limitError) {
      return
    }

    const newFiles: UploadedFile[] = []

    for (const file of Array.from(selectedFiles)) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      if (!validTypes.includes(file.type)) continue

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) continue

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
        status: 'uploading'
      })
    }

    if (newFiles.length === 0) return

    setFiles(prev => [...prev, ...newFiles])
    uploadFiles(newFiles)
  }

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true)

    for (const fileItem of filesToUpload) {
      try {
        let fileToUpload = fileItem.file
        let fileHash = ''

        try {
          fileHash = await calculateFileHash(fileItem.file)
        } catch (hashError) {
          console.error('Error calculating hash:', hashError)
        }

        const validationResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-upload`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId,
              uploaderName: uploaderName.trim(),
              fileHash,
            }),
          }
        )

        const validationData = await validationResponse.json()

        if (!validationResponse.ok || !validationData.allowed) {
          throw new Error(validationData.message || 'No puedes subir más fotos')
        }

        if (fileItem.file.type === 'image/heic' || fileItem.file.type === 'image/heif') {
          try {
            const heicConvert = await import('heic-convert')
            const arrayBuffer = await fileItem.file.arrayBuffer()
            const jpegBuffer = await heicConvert.default({ buffer: arrayBuffer, format: 'JPEG', quality: 0.85 })
            fileToUpload = new File([jpegBuffer], fileItem.file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
          } catch {
          }
        }

        const fileName = `${eventSlug}/${Date.now()}-${Math.random().toString(36).substring(7)}-${fileToUpload.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(uploadError.message)
        if (!uploadData?.path) throw new Error('No se recibió la ruta del archivo')

        const { data: photoData, error: dbError } = await supabase.from('photos').insert({
          event_id: eventId,
          image_path: uploadData.path,
          format: fileToUpload.type,
          size: fileToUpload.size,
          status: autoApprove ? 'approved' : 'pending',
          uploader_name: uploaderName.trim(),
          file_hash: fileHash || null,
        }).select().single()

        if (dbError) {
          await supabase.storage.from('event-photos').remove([uploadData.path])
          throw new Error(dbError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('event-photos')
          .getPublicUrl(uploadData.path)

        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              photoId: photoData.id,
              imageUrl: publicUrl,
            }),
          }
        ).catch(err => console.error('Thumbnail generation failed:', err))

        if (fileHash) {
          await supabase.from('photo_hashes').insert({
            photo_id: null,
            file_hash: fileHash,
            event_id: eventId,
          })
        }

        await supabase.rpc('increment_upload_count', {
          p_event_id: eventId,
          p_uploader_name: uploaderName.trim(),
        })

        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'success' } : f))
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', errorMessage: error.message } : f))

        if (error.message.includes('límite') || error.message.includes('limite')) {
          setLimitError(error.message)
          await checkUploadLimits()
        }
      }
    }

    setIsUploading(false)
    await checkUploadLimits()
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  // ─── STEP 1: Identity ────────────────────────────────────────────────────────
  if (step === 'identity') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xs space-y-8">

          {/* Icon + event name */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-white/[0.07] border border-white/10 rounded-3xl flex items-center justify-center mx-auto">
              <Camera className="w-10 h-10 text-white/50" />
            </div>
            <div>
              <p className="text-white/30 text-xs tracking-widest uppercase mb-1">Compartir fotos</p>
              <h1 className="text-xl font-light text-white leading-snug">{eventName}</h1>
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs text-center tracking-wide uppercase">¿Cómo te llamamos?</p>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && uploaderName.trim() && hasConsented && setStep('upload')}
              placeholder="Tu nombre"
              autoFocus
              className="w-full bg-white/[0.07] border border-white/15 text-white text-lg text-center placeholder-white/20 rounded-2xl px-5 py-4 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setHasConsented(!hasConsented)}
              className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-all mt-0.5 ${
                hasConsented ? 'bg-white border-white' : 'border-white/30 group-hover:border-white/50'
              }`}
            >
              {hasConsented && <Check className="w-3 h-3 text-black" />}
            </div>
            <span className="text-white/35 text-sm leading-relaxed">
              Autorizo que mis fotos aparezcan en la galería de este evento y sean visibles para los asistentes.
            </span>
          </label>

          {/* Continue button */}
          <button
            onClick={() => setStep('upload')}
            disabled={!uploaderName.trim() || !hasConsented}
            className="w-full py-4 rounded-2xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            Continuar
          </button>

          <p className="text-white/20 text-xs text-center">HEIC · HEIF · JPG · PNG · máx 10 MB por foto</p>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Upload ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">

      {/* Uploader identity strip */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs">Subiendo como</p>
          <p className="text-white font-medium">{uploaderName}</p>
        </div>
        {successCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 text-xs font-medium">{successCount} enviada{successCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Upload limits info */}
      {uploadLimits && uploadLimits.allowed && (
        <div className="px-6 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-white/40 text-xs">
              {uploadLimits.total_uploads || 0} / {uploadLimits.total_limit || 50} fotos
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="text-white/40 text-xs">
              {uploadLimits.uploads_in_window || 0} / {uploadLimits.rate_limit || 10} últimos 5 min
            </div>
          </div>
        </div>
      )}

      {/* Limit error banner */}
      {limitError && (
        <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium mb-1">Límite alcanzado</p>
            <p className="text-red-400/80 text-xs leading-relaxed">{limitError}</p>
            {uploadLimits?.retry_after_seconds && (
              <p className="text-red-400/60 text-xs mt-2">
                Podrás subir más en {Math.ceil(uploadLimits.retry_after_seconds / 60)} minutos
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/heic,image/heif,image/jpeg,image/jpg,image/png"
        capture="environment"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/heic,image/heif,image/jpeg,image/jpg,image/png"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Big upload buttons */}
      <div className="flex flex-col border-b border-white/[0.06]" style={{ minHeight: '40vh' }}>
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading || !!limitError}
          className="flex-1 flex flex-col items-center justify-center gap-5 border-b border-white/[0.06] hover:bg-white/[0.04] active:bg-white/[0.07] transition-colors group disabled:opacity-40"
        >
          <div className="w-16 h-16 bg-white/[0.07] group-hover:bg-white/[0.12] border border-white/10 rounded-full flex items-center justify-center transition-colors">
            <Camera className="w-7 h-7 text-white/50 group-hover:text-white/80 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-light tracking-tight">Tomar foto</p>
            <p className="text-white/30 text-sm mt-1">Abre la cámara ahora</p>
          </div>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={isUploading || !!limitError}
          className="flex-1 flex flex-col items-center justify-center gap-5 hover:bg-white/[0.04] active:bg-white/[0.07] transition-colors group disabled:opacity-40"
        >
          <div className="w-16 h-16 bg-white/[0.07] group-hover:bg-white/[0.12] border border-white/10 rounded-full flex items-center justify-center transition-colors">
            <ImageIcon className="w-7 h-7 text-white/50 group-hover:text-white/80 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-light tracking-tight">De tu galería</p>
            <p className="text-white/30 text-sm mt-1">Elige fotos existentes</p>
          </div>
        </button>
      </div>

      {/* Photo grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-white/5">
          {files.map((fileItem) => (
            <div key={fileItem.id} className="relative aspect-square bg-black overflow-hidden">
              <img
                src={fileItem.preview}
                alt=""
                className="w-full h-full object-cover"
              />

              {/* Status overlay */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                fileItem.status === 'success' ? 'bg-black/20' : 'bg-black/50'
              }`}>
                {fileItem.status === 'uploading' && (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                )}
                {fileItem.status === 'success' && (
                  <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {fileItem.status === 'error' && (
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Remove */}
              {fileItem.status !== 'uploading' && (
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error notice */}
      {hasErrors && (
        <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">Algunas fotos no se pudieron subir</p>
          <button
            onClick={() => setFiles(prev => prev.filter(f => f.status !== 'error'))}
            className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Bottom: gallery link */}
      <div className="mt-auto p-6 text-center">
        <p className="text-white/20 text-xs mb-3">
          {autoApprove
            ? 'Tus fotos aparecerán inmediatamente en la galería'
            : 'Las fotos se revisan antes de aparecer en la galería'}
        </p>
        <Link to={`/gallery/${eventSlug}`}>
          <button className="text-white/30 hover:text-white/60 text-sm transition-colors">
            Ver galería del evento →
          </button>
        </Link>
      </div>
    </div>
  )
}
