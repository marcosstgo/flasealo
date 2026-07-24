import React, { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, ImagePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface OrganizerPhotoUploaderProps {
  eventId: string
  eventSlug: string
}

interface UploadedFile {
  file: File
  preview: string
  id: string
  status: 'uploading' | 'success' | 'error'
  errorMessage?: string
}

export function OrganizerPhotoUploader({ eventId, eventSlug }: OrganizerPhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const successCount = files.filter(f => f.status === 'success').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const errorCount = files.filter(f => f.status === 'error').length

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []

    for (const file of Array.from(selectedFiles)) {
      const maxSize = 25 * 1024 * 1024
      if (file.size > maxSize) continue

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
      if (file.type && !validTypes.includes(file.type)) continue

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
        status: 'uploading',
      })
    }

    if (newFiles.length === 0) return

    setFiles(prev => [...prev, ...newFiles])
    await uploadFiles(newFiles)
  }

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true)

    for (const fileItem of filesToUpload) {
      try {
        let fileToUpload = fileItem.file

        if (fileItem.file.type === 'image/heic' || fileItem.file.type === 'image/heif') {
          try {
            const heicConvert = await import('heic-convert')
            const arrayBuffer = await fileItem.file.arrayBuffer()
            const jpegBuffer = await heicConvert.default({ buffer: arrayBuffer, format: 'JPEG', quality: 0.85 })
            fileToUpload = new File([jpegBuffer], fileItem.file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
          } catch {
            // continue with original if conversion fails
          }
        }

        const fileName = `${eventSlug}/${Date.now()}-${Math.random().toString(36).substring(7)}-${fileToUpload.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(uploadError.message)
        if (!uploadData?.path) throw new Error('No se recibió la ruta del archivo')

        const { data: photoData, error: dbError } = await supabase
          .from('photos')
          .insert({
            event_id: eventId,
            image_path: uploadData.path,
            format: fileToUpload.type,
            size: fileToUpload.size,
            status: 'approved',
            uploader_name: 'Organizador',
          })
          .select()
          .single()

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
            body: JSON.stringify({ photoId: photoData.id, imageUrl: publicUrl }),
          }
        ).catch(() => {})

        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'success' } : f))
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', errorMessage: error.message } : f))
      }
    }

    setIsUploading(false)
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  const clearCompleted = () => {
    setFiles(prev => {
      prev.filter(f => f.status === 'success').forEach(f => URL.revokeObjectURL(f.preview))
      return prev.filter(f => f.status !== 'success')
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium dark:text-white text-gray-900">Subir fotos</h3>
          <p className="text-xs dark:text-white/40 text-gray-500 mt-0.5">Se publican directamente en la galería</p>
        </div>
        {successCount > 0 && (
          <button
            onClick={clearCompleted}
            className="text-xs dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'dark:border-white/40 border-gray-400 dark:bg-white/5 bg-gray-50'
            : 'dark:border-white/10 border-gray-200 dark:hover:border-white/20 hover:border-gray-300 dark:hover:bg-white/[0.03] hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/heic,image/heif,image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={(e) => { handleFileSelect(e.target.files); e.target.value = '' }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isDragging
              ? 'dark:bg-white/10 bg-gray-200'
              : 'dark:bg-white/[0.07] bg-gray-100'
          }`}>
            {isUploading && uploadingCount > 0
              ? <div className="animate-spin rounded-full h-4 w-4 border-2 dark:border-white/40 border-gray-400 border-t-transparent" />
              : <ImagePlus className="w-5 h-5 dark:text-white/40 text-gray-400" />
            }
          </div>
          <div>
            <p className="text-sm dark:text-white/70 text-gray-600 font-medium">
              {isDragging ? 'Suelta las fotos aquí' : 'Arrastra fotos o haz clic'}
            </p>
            <p className="text-xs dark:text-white/30 text-gray-400 mt-0.5">HEIC · HEIF · JPG · PNG · WEBP · máx 25 MB</p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      {files.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          {uploadingCount > 0 && (
            <span className="dark:text-white/40 text-gray-400">
              Subiendo {uploadingCount}...
            </span>
          )}
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <Check className="w-3 h-3" />
              {successCount} subida{successCount !== 1 ? 's' : ''}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle className="w-3 h-3" />
              {errorCount} error{errorCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}

      {/* Photo grid */}
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {files.map((fileItem) => (
            <div key={fileItem.id} className="relative aspect-square rounded-lg overflow-hidden dark:bg-white/5 bg-gray-100">
              <img src={fileItem.preview} alt="" className="w-full h-full object-cover" />

              {/* Status overlay */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                fileItem.status === 'success' ? 'bg-black/10' : 'bg-black/50'
              }`}>
                {fileItem.status === 'uploading' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                )}
                {fileItem.status === 'success' && (
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {fileItem.status === 'error' && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow">
                    <X className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              {fileItem.status !== 'uploading' && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(fileItem.id) }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
