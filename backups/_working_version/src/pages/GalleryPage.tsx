import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Camera, ArrowLeft, Heart, Download } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  slug: string
  is_public: boolean
  allow_downloads: boolean
}

interface Photo {
  id: string
  image_path: string
  created_at: string
  format: string
  size: number
}

export function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()

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

    // Si es el evento demo, crear datos de muestra
    if (eventSlug === 'demo-event') {
      return {
        id: 'demo-id',
        name: 'Boda de María y Carlos',
        description: 'Celebrando nuestro amor con familia y amigos en este día especial',
        slug: 'demo-event',
        is_public: true,
        allow_downloads: true // Demo permite descargas
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

    // Si es el evento demo, devolver fotos de muestra usando Pexels
    if (event.id === 'demo-id') {
      return [
        {
          id: '1',
          image_path: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '2',
          image_path: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '3',
          image_path: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '4',
          image_path: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '5',
          image_path: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '6',
          image_path: 'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '7',
          image_path: 'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        },
        {
          id: '8',
          image_path: 'https://images.pexels.com/photos/1444416/pexels-photo-1444416.jpeg?auto=compress&cs=tinysrgb&w=800',
          created_at: new Date().toISOString(),
          format: 'image/jpeg',
          size: 1024000
        }
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
    // Si es una URL de Pexels, devolverla directamente
    if (imagePath.startsWith('https://')) {
      return imagePath
    }
    
    // Si no, obtener la URL de Supabase
    const { data } = supabase.storage
      .from('event-photos')
      .getPublicUrl(imagePath)
    return data.publicUrl
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

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Evento No Encontrado
          </h1>
          <p className="text-gray-600 mb-4">
            El evento que buscas no existe o no está disponible públicamente.
          </p>
          <Link to="/">
            <Button>Volver al Inicio</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Inicio
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Flashealo.com
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-600">{photos?.length || 0} fotos</span>
              {!event.allow_downloads && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Solo vista
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Event Info */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              {event.description}
            </p>
          )}
          {eventSlug === 'demo-event' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-blue-800 text-sm">
                <strong>Esta es una demostración.</strong> Las fotos mostradas son de ejemplo. 
                En un evento real, aquí aparecerían las fotos subidas por los invitados después de ser aprobadas.
              </p>
            </div>
          )}
          {!event.allow_downloads && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-2xl mx-auto mt-4">
              <p className="text-amber-800 text-sm">
                <strong>Modo solo vista:</strong> El organizador ha configurado esta galería 
                para que las fotos solo puedan ser visualizadas, no descargadas.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Photos Gallery */}
      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {photosLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !photos || photos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aún no hay fotos
                </h3>
                <p className="text-gray-600">
                  Las fotos aparecerán aquí una vez que los invitados las suban y sean aprobadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="aspect-square relative">
                      <img
                        src={getImageUrl(photo.image_path)}
                        alt="Foto del evento"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Overlay with download button - only show if downloads are allowed */}
                      {event.allow_downloads && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                          <Button
                            size="sm"
                            onClick={() => downloadImage(getImageUrl(photo.image_path), photo.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload CTA */}
      {eventSlug !== 'demo-event' && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Tienes fotos de este evento?
            </h3>
            <p className="text-gray-600 mb-6">
              Comparte tus momentos especiales con todos los invitados
            </p>
            <Link to={`/upload/${eventSlug}`}>
              <Button size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Subir Fotos
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}