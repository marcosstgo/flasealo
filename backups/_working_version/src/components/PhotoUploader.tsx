import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Check, User, Image } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardContent } from './ui/Card'
import { supabase } from '../lib/supabase'

interface PhotoUploaderProps {
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

export function PhotoUploader({ eventId, eventSlug }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploaderName, setUploaderName] = useState('')
  const [hasConsented, setHasConsented] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null, source: 'camera' | 'gallery') => {
    if (!selectedFiles) return
    if (!uploaderName.trim()) {
      alert('Por favor ingresa tu nombre antes de seleccionar fotos')
      return
    }
    if (!hasConsented) {
      alert('Debes aceptar los términos de consentimiento para continuar')
      return
    }

    const newFiles: UploadedFile[] = []
    
    Array.from(selectedFiles).forEach((file) => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      if (!validTypes.includes(file.type)) {
        alert(`El archivo ${file.name} no es un formato de imagen compatible`)
        return
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        alert(`El archivo ${file.name} es demasiado grande. El tamaño máximo es 10MB`)
        return
      }

      const preview = URL.createObjectURL(file)
      newFiles.push({
        file,
        preview,
        id: Math.random().toString(36).substring(7),
        status: 'uploading'
      })
    })

    setFiles(prev => [...prev, ...newFiles])
    uploadFiles(newFiles)
  }

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true)

    for (const fileItem of filesToUpload) {
      try {
        // Convert HEIC to JPEG if needed
        let fileToUpload = fileItem.file
        if (fileItem.file.type === 'image/heic' || fileItem.file.type === 'image/heif') {
          try {
            const heicConvert = await import('heic-convert')
            const arrayBuffer = await fileItem.file.arrayBuffer()
            const jpegBuffer = await heicConvert.default({
              buffer: arrayBuffer,
              format: 'JPEG',
              quality: 0.8
            })
            fileToUpload = new File([jpegBuffer], fileItem.file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg'
            })
          } catch (heicError) {
            console.warn('HEIC conversion failed, uploading original file:', heicError)
          }
        }

        const fileName = `${eventSlug}/${Date.now()}-${Math.random().toString(36).substring(7)}-${fileToUpload.name}`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`Error al subir archivo: ${uploadError.message}`)
        }

        if (!uploadData?.path) {
          throw new Error('No se recibió la ruta del archivo subido')
        }

        // Save photo record to database with uploader name
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            event_id: eventId,
            image_path: uploadData.path,
            format: fileToUpload.type,
            size: fileToUpload.size,
            status: 'pending',
            uploader_name: uploaderName.trim()
          })

        if (dbError) {
          console.error('Database insert error:', dbError)
          // Try to delete the uploaded file if database insert fails
          await supabase.storage
            .from('event-photos')
            .remove([uploadData.path])
          throw new Error(`Error al guardar en base de datos: ${dbError.message}`)
        }

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'success' }
            : f
        ))
      } catch (error: any) {
        console.error('Upload error:', error)
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', errorMessage: error.message || 'Error desconocido' }
            : f
        ))
      }
    }

    setIsUploading(false)
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const handleStartUpload = () => {
    if (!uploaderName.trim()) {
      alert('Por favor ingresa tu nombre')
      return
    }
    if (!hasConsented) {
      alert('Debes aceptar los términos de consentimiento')
      return
    }
    setShowForm(true)
  }

  if (!showForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10 text-purple-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  ¡Comparte tus Fotos del Evento!
                </h2>
                <p className="text-gray-600 text-base max-w-md mx-auto">
                  Ayúdanos a capturar todos los momentos especiales desde tu perspectiva única
                </p>
              </div>

              <div className="max-w-sm mx-auto space-y-4">
                <Input
                  label="Tu nombre"
                  placeholder="Ej: María González"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  className="text-center"
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={hasConsented}
                      onChange={(e) => setHasConsented(e.target.checked)}
                      className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor="consent" className="text-sm text-blue-800 leading-relaxed">
                      <strong>Consentimiento:</strong> Al subir mis fotos, autorizo su publicación en la galería del evento y entiendo que serán visibles para todos los asistentes y organizadores.
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleStartUpload}
                  disabled={!uploaderName.trim() || !hasConsented}
                  className="w-full"
                  size="lg"
                >
                  <User className="w-5 h-5 mr-2" />
                  Continuar
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Formatos compatibles: HEIC, JPG, PNG • Máximo 10MB por foto
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-lg font-semibold text-gray-900">
                Hola, {uploaderName}
              </span>
            </div>

            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-purple-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Selecciona tus Fotos
              </h2>
              <p className="text-gray-600 text-sm">
                Elige las mejores fotos que capturaste del evento
              </p>
            </div>
            
            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/heic,image/jpeg,image/jpg,image/png"
              capture="environment"
              multiple
              onChange={(e) => handleFileSelect(e.target.files, 'camera')}
              className="hidden"
            />

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/heic,image/jpeg,image/jpg,image/png"
              multiple
              onChange={(e) => handleFileSelect(e.target.files, 'gallery')}
              className="hidden"
            />

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Tomar Foto
              </Button>
              
              <Button
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full sm:w-auto"
                size="lg"
              >
                <Image className="w-5 h-5 mr-2" />
                Seleccionar de Galería
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Las fotos serán revisadas antes de aparecer en la galería
            </p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {files.map((fileItem) => (
            <div key={fileItem.id} className="relative">
              <Card className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={fileItem.preview}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    {fileItem.status === 'uploading' && (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto mb-1" />
                        <span className="text-xs text-white">Subiendo...</span>
                      </div>
                    )}
                    {fileItem.status === 'success' && (
                      <div className="text-center">
                        <Check className="w-6 h-6 text-green-400 mx-auto mb-1" />
                        <span className="text-xs text-white">Subida</span>
                      </div>
                    )}
                    {fileItem.status === 'error' && (
                      <div className="text-center">
                        <X className="w-6 h-6 text-red-400 mx-auto mb-1" />
                        <span className="text-xs text-white">Error</span>
                        {fileItem.errorMessage && (
                          <div className="text-xs text-red-200 mt-1 max-w-20 break-words">
                            {fileItem.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {files.some(f => f.status === 'success') && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Gracias por compartir!
            </h3>
            <p className="text-gray-600 text-sm">
              Tus fotos han sido enviadas y serán revisadas antes de aparecer en la galería del evento.
            </p>
          </CardContent>
        </Card>
      )}

      {files.some(f => f.status === 'error') && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Algunas fotos no se pudieron subir
            </h3>
            <p className="text-red-700 text-sm mb-4">
              Revisa los errores mostrados en las fotos e intenta subirlas nuevamente.
            </p>
            <Button
              onClick={() => setFiles(prev => prev.filter(f => f.status !== 'error'))}
              variant="outline"
              size="sm"
            >
              Limpiar Errores
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}