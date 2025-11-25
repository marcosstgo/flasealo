import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Eye, Trash2 } from 'lucide-react'
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
}

export function ImageModerationQueue({ eventId }: ImageModerationQueueProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
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
      .order('created_at', { ascending: false })

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

  async function deletePhoto(photoId: string) {
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('image_path')
      .eq('id', photoId)
      .single()

    if (fetchError) throw fetchError

    const { error: storageError } = await supabase.storage
      .from('event-photos')
      .remove([photo.image_path])

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }

    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (dbError) throw dbError
  }

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('event-photos')
      .getPublicUrl(imagePath)
    return data.publicUrl
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

  const handleDeletePhoto = (photoId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer.')) {
      deletePhotoMutation.mutate(photoId)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Photo Moderation Queue
            </h3>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
              {photos?.length || 0} pending
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {!photos || photos.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No photos pending review</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={getImageUrl(photo.image_path)}
                      alt="Pending photo"
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPhoto(photo)}
                          className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => moderatePhotoMutation.mutate({ photoId: photo.id, status: 'approved' })}
                          className="bg-green-600 hover:bg-green-700"
                          isLoading={moderatePhotoMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => moderatePhotoMutation.mutate({ photoId: photo.id, status: 'rejected' })}
                          className="bg-red-600 hover:bg-red-700"
                          isLoading={moderatePhotoMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Photos Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Fotos Aprobadas
            </h3>
            <div className="flex items-center gap-2">
              {showApproved && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {approvedPhotos?.length || 0} fotos
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproved(!showApproved)}
              >
                {showApproved ? 'Ocultar' : 'Ver Galería'}
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
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">No hay fotos aprobadas aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {approvedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={getImageUrl(photo.image_path)}
                        alt="Approved photo"
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay with delete action */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPhoto(photo)}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="bg-red-600 hover:bg-red-700"
                            isLoading={deletePhotoMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Photo preview modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Photo Preview</h3>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={getImageUrl(selectedPhoto.image_path)}
                alt="Photo preview"
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
              <div className="mt-4 flex gap-2 justify-center">
                {selectedPhoto.status === 'pending' ? (
                  <>
                    <Button
                      onClick={() => {
                        moderatePhotoMutation.mutate({ photoId: selectedPhoto.id, status: 'approved' })
                        setSelectedPhoto(null)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                      isLoading={moderatePhotoMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        moderatePhotoMutation.mutate({ photoId: selectedPhoto.id, status: 'rejected' })
                        setSelectedPhoto(null)
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      isLoading={moderatePhotoMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      handleDeletePhoto(selectedPhoto.id)
                      setSelectedPhoto(null)
                    }}
                    className="bg-red-600 hover:bg-red-700"
                    isLoading={deletePhotoMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Foto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}