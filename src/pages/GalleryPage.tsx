import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Camera, ArrowLeft, Heart, Download, Upload } from 'lucide-react'
import { PhotoViewer } from '../components/PhotoViewer'
import { ThemeToggle } from '../components/ThemeToggle'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  slug: string
  is_public: boolean
  allow_downloads: boolean
  gallery_password: string | null
}

interface Photo {
  id: string
  image_path: string
  thumbnail_url: string | null
  created_at: string
  format: string
  size: number
  uploader_name: string | null
}

export function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [passwordInput, setPasswordInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [passwordError, setPasswordError] = useState(false)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event-by-slug', eventSlug],
    queryFn: fetchEventBySlug,
    enabled: !!eventSlug,
  })

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['gallery-photos', event?.id],
    queryFn: fetchApprovedPhotos,
    enabled: !!event?.id,
  })

  async function fetchEventBySlug(): Promise<Event> {
    if (!eventSlug) throw new Error('Event slug is required')

    if (eventSlug === 'demo-event') {
      return {
        id: 'demo-id',
        name: 'Boda de María y Carlos',
        description: 'Celebrando nuestro amor con familia y amigos en este día especial',
        slug: 'demo-event',
        is_public: true,
        allow_downloads: true,
        gallery_password: null,
      }
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', eventSlug)
      .eq('is_public', true)
      .single()

    if (error) throw error
    return data
  }

  async function fetchApprovedPhotos(): Promise<Photo[]> {
    if (!event?.id) return []

    if (event.id === 'demo-id') {
      return [
        { id: '1', image_path: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Ana' },
        { id: '2', image_path: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Carlos' },
        { id: '3', image_path: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
        { id: '4', image_path: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'María' },
        { id: '5', image_path: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Pedro' },
        { id: '6', image_path: 'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
        { id: '7', image_path: 'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Laura' },
        { id: '8', image_path: 'https://images.pexels.com/photos/1444416/pexels-photo-1444416.jpeg?auto=compress&cs=tinysrgb&w=800', created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
      ]
    }

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', event.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('https://')) return imagePath
    const { data } = supabase.storage.from('event-photos').getPublicUrl(imagePath)
    return data.publicUrl
  }

  const getThumbnailUrl = (photo: Photo) => {
    if (photo.thumbnail_url) return photo.thumbnail_url
    return getImageUrl(photo.image_path)
  }

  const downloadImage = async (imageUrl: string, photoId: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `flashealo-${event?.slug}-${photoId}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index)
    setViewerOpen(true)
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 dark:border-white/40 border-gray-400" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 dark:bg-white/10 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 dark:text-white/40 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Evento No Encontrado</h1>
          <p className="dark:text-white/50 text-gray-500 mb-6">
            El evento que buscas no existe o no está disponible públicamente.
          </p>
          <Link to="/">
            <button className="dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 px-6 py-2.5 rounded-full transition-colors text-sm">
              Volver al Inicio
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // Password gate
  const needsPassword = event?.gallery_password && eventSlug !== 'demo-event' && !unlocked

  const handleUnlock = () => {
    if (passwordInput === event?.gallery_password) {
      setUnlocked(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">{event.name}</h1>
            <p className="dark:text-white/40 text-gray-500 text-sm">Esta galería está protegida con contraseña</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Contraseña"
              className="w-full dark:bg-white/10 bg-gray-100 dark:border dark:border-white/20 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-lg px-4 py-3 text-center focus:outline-none dark:focus:border-white/50 focus:border-gray-500 transition-colors"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm">Contraseña incorrecta</p>
            )}
            <button
              onClick={handleUnlock}
              className="w-full dark:bg-white dark:text-gray-900 bg-gray-900 text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Ver galería
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7]">
      {/* Header */}
      <header className="dark:bg-black/60 bg-[#faf9f7]/90 backdrop-blur-sm border-b dark:border-white/10 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <button className="dark:text-white/50 dark:hover:text-white text-gray-400 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <span className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase font-medium">
                Flashealo
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Heart className="w-4 h-4 dark:text-white/30 text-gray-400" />
              <span className="text-sm dark:text-white/40 text-gray-500">{photos?.length || 0} fotos</span>
              {!event.allow_downloads && (
                <span className="text-xs dark:bg-white/10 dark:text-white/50 bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  Solo vista
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Event Title */}
      <section className="py-12 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-light dark:text-white text-gray-900 tracking-tight mb-3">
          {event.name}
        </h1>
        {event.description && (
          <p className="dark:text-white/40 text-gray-500 text-base max-w-xl mx-auto">
            {event.description}
          </p>
        )}
        {eventSlug === 'demo-event' && (
          <div className="mt-6 dark:bg-white/5 bg-gray-100 dark:border dark:border-white/10 border border-gray-200 rounded-lg p-4 max-w-lg mx-auto">
            <p className="dark:text-white/50 text-gray-500 text-sm">
              Demostración — en un evento real aquí aparecen las fotos de los invitados.
            </p>
          </div>
        )}
      </section>

      {/* Photo Grid */}
      <section className="pb-20 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          {photosLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square dark:bg-white/5 bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : !photos || photos.length === 0 ? (
            <div className="text-center py-24">
              <div className="mx-auto w-16 h-16 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 dark:text-white/20 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium dark:text-white/50 text-gray-500 mb-2">Aún no hay fotos</h3>
              <p className="dark:text-white/30 text-gray-400 text-sm">
                Las fotos aparecerán aquí una vez que los invitados las suban y sean aprobadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square overflow-hidden cursor-pointer dark:bg-white/5 bg-gray-200"
                  onClick={() => openPhotoViewer(index)}
                >
                  <img
                    src={getThumbnailUrl(photo)}
                    alt="Foto del evento"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />

                  {event.allow_downloads && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadImage(getImageUrl(photo.image_path), photo.id)
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {photo.uploader_name && (
                    <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/70 to-transparent p-3 pt-6">
                      <p className="text-white/80 text-xs">{photo.uploader_name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload CTA */}
      {eventSlug !== 'demo-event' && (
        <section className="py-16 px-4 border-t dark:border-white/10 border-gray-200">
          <div className="max-w-sm mx-auto text-center">
            <Upload className="w-8 h-8 dark:text-white/20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-light dark:text-white/70 text-gray-600 mb-2">
              ¿Tomaste fotos del evento?
            </h3>
            <p className="dark:text-white/30 text-gray-400 text-sm mb-6">
              Compártelas con todos los invitados
            </p>
            <Link to={`/upload/${eventSlug}`}>
              <button className="dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white dark:hover:border-white/40 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all px-6 py-2.5 rounded-full text-sm">
                Subir fotos
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Photo Viewer */}
      {photos && (
        <PhotoViewer
          photos={photos}
          currentIndex={currentPhotoIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={event.allow_downloads ? downloadImage : undefined}
          allowDownloads={event.allow_downloads}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  )
}
