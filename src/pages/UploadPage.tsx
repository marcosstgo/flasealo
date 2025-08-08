import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Camera, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { PhotoUploader } from '../components/PhotoUploader'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  slug: string
}

export function UploadPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-by-slug', eventSlug],
    queryFn: fetchEventBySlug,
    enabled: !!eventSlug,
  })

  async function fetchEventBySlug(): Promise<Event> {
    if (!eventSlug) throw new Error('Event slug is required')

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', eventSlug)
      .single()

    if (error) throw error
    return data
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Evento No Encontrado
          </h1>
          <p className="text-gray-600 mb-6">
            El evento que buscas no existe o el código QR puede estar dañado.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Flashealo.com
              </span>
            </div>
            <Link to={`/gallery/${event.slug}`}>
              <Button variant="outline" size="sm">
                Ver Galería
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
              {event.description}
            </p>
          )}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-purple-800 text-sm">
              <strong>¡Bienvenido!</strong> Comparte las fotos que tomaste del evento. 
              Tu perspectiva única ayuda a crear una galería completa de todos los momentos especiales.
            </p>
          </div>
        </div>

        <PhotoUploader eventId={event.id} eventSlug={event.slug} />

        <div className="text-center mt-12 text-sm text-gray-500 space-y-2">
          <p>
            <strong>¿Cómo funciona?</strong>
          </p>
          <p>
            1. Ingresa tu nombre • 2. Acepta el consentimiento • 3. Selecciona tus fotos • 4. ¡Listo!
          </p>
          <p className="text-xs">
            Las fotos serán revisadas por el organizador antes de aparecer en la galería pública.
          </p>
        </div>
      </main>
    </div>
  )
}