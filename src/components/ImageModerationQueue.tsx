import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Eye, Trash2, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader } from './ui/Card'
import { supabase } from '../lib/supabase'

interface ImageModerationQueueProps {
  eventId: string
}

interface Photo {
  id: string
  image_path: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  format: string
  size: number
  uploader_name?: string | null
}

export function ImageModerationQueue({ eventId }: ImageModerationQueueProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [showApproved, setShowApproved] = useState(false)
  const queryClient = useQueryClient()

  const { data: photos, isLoading } = useQuery({
    queryKey: ['pending-photos', eventId],
    queryFn: fetchPendingPhotos,
  })

  const { data: approvedPhotos, isLoading: approvedLoading } = useQuery({
    queryKey: ['approved-photos', eventId],
    queryFn: fetchApprovedPhotos,
    enabled: showApproved,
  })

  const moderatePhotoMutation = useMutation({
    mutationFn: moderatePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['approved-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-stats', eventId] })
      queryClient.invalidateQueries({ queryKey: ['gallery-photos', eventId] })
    },
  })

  const approveAllMutation = useMutation({
    mutationFn: approveAllPending,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['approved-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-stats', eventId] })
      queryClient.invalidateQueries({ queryKey: ['gallery-photos', eventId] })
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: deletePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-stats', eventId] })
      queryClient.invalidateQueries({ queryKey: ['gallery-photos', eventId] })
    },
  })

  async function fetchPendingPhotos(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  async function fetchApprovedPhotos(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async function moderatePhoto({ photoId, status }: { photoId: string; status: 'approved' | 'rejected' }) {
    const { error } = await supabase
      .from('photos')
      .update({ status })
      .eq('id', photoId)

    if (error) throw error
  }

  async function approveAllPending() {
    const { error } = await supabase
      .from('photos')
      .update({ status: 'approved' })
      .eq('event_id', eventId)
      .eq('status', 'pending')

    if (error) throw error
  }

  async function deletePhoto(photoId: string) {
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('image_path')
      .eq('id', photoId)
      .single()

    if (fetchError) throw fetchError

    await supabase.storage.from('event-photos').remove([photo.image_path])

    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (dbError) throw dbError
  }

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage.from('event-photos').getPublicUrl(imagePath)
    return data.publicUrl
  }

  const handleApproveAll = () => {
    if (!photos?.length) return
    if (confirm(`¿Aprobar todas las ${photos.length} fotos pendientes?`)) {
      approveAllMutation.mutate()
    }
  }

  // Approve/reject from fullscreen preview and advance to next
  const handleModerateInPreview = (status: 'approved' | 'rejected') => {
    if (previewIndex === null || !photos) return
    const photo = photos[previewIndex]
    moderatePhotoMutation.mutate({ photoId: photo.id, status })

    // Advance to next or close if last
    if (previewIndex < photos.length - 1) {
      setPreviewIndex(previewIndex + 1)
    } else {
      setPreviewIndex(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const previewPhoto = previewIndex !== null && photos ? photos[previewIndex] : null

  return (
    <>
      {/* Fullscreen preview */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/60">
            <div className="flex items-center space-x-3">
              <span className="text-white/60 text-sm">
                {(previewIndex ?? 0) + 1} de {photos?.length}
              </span>
              {previewPhoto.uploader_name && (
                <span className="text-white text-sm font-medium">
                  — {previewPhoto.uploader_name}
                </span>
              )}
            </div>
            <button
              onClick={() => setPreviewIndex(null)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative px-16">
            {/* Prev */}
            {(previewIndex ?? 0) > 0 && (
              <button
                onClick={() => setPreviewIndex((previewIndex ?? 0) - 1)}
                className="absolute left-4 text-white/50 hover:text-white transition-colors bg-black/40 rounded-full p-2"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={getImageUrl(previewPhoto.image_path)}
              alt="Vista previa"
              className="max-w-full max-h-full object-contain"
            />

            {/* Next */}
            {photos && (previewIndex ?? 0) < photos.length - 1 && (
              <button
                onClick={() => setPreviewIndex((previewIndex ?? 0) + 1)}
                className="absolute right-4 text-white/50 hover:text-white transition-colors bg-black/40 rounded-full p-2"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-center gap-4 px-6 py-6 bg-black/60">
            <button
              onClick={() => handleModerateInPreview('rejected')}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              <X className="w-5 h-5" />
              Rechazar
            </button>
            <button
              onClick={() => handleModerateInPreview('approved')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              <Check className="w-5 h-5" />
              Aprobar
            </button>
          </div>
        </div>
      )}

      {/* Pending queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Cola de Moderación
              </h3>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                {photos?.length || 0} pendientes
              </span>
            </div>
            {photos && photos.length > 0 && (
              <Button
                onClick={handleApproveAll}
                isLoading={approveAllMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Aprobar todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!photos || photos.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No hay fotos pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={getImageUrl(photo.image_path)}
                      alt="Foto pendiente"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button
                          onClick={() => setPreviewIndex(index)}
                          className="bg-white text-gray-900 hover:bg-gray-100 rounded-full p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moderatePhotoMutation.mutate({ photoId: photo.id, status: 'approved' })}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moderatePhotoMutation.mutate({ photoId: photo.id, status: 'rejected' })}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {photo.uploader_name && (
                    <p className="mt-1 text-xs text-gray-500 truncate">{photo.uploader_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved photos */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Fotos Aprobadas</h3>
            <div className="flex items-center gap-2">
              {showApproved && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {approvedPhotos?.length || 0} fotos
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowApproved(!showApproved)}>
                {showApproved ? 'Ocultar' : 'Ver galería'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showApproved && (
          <CardContent>
            {approvedLoading ? (
              <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded" />
                ))}
              </div>
            ) : !approvedPhotos || approvedPhotos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay fotos aprobadas aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {approvedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={getImageUrl(photo.image_path)}
                        alt="Foto aprobada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar esta foto?')) deletePhotoMutation.mutate(photo.id)
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {photo.uploader_name && (
                      <p className="mt-1 text-xs text-gray-500 truncate">{photo.uploader_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </>
  )
}
