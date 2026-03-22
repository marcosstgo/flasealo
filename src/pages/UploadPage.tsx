import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
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
    const { data, error } = await supabase.from('events').select('*').eq('slug', eventSlug).single()
    if (error) throw error
    return data
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-white/20" />
          </div>
          <h1 className="text-xl font-light text-white mb-2">Evento no encontrado</h1>
          <p className="text-white/40 text-sm mb-6">El código QR puede estar dañado o el evento ya no está disponible.</p>
          <Link to="/">
            <button className="border border-white/20 text-white/60 hover:text-white hover:border-white/40 px-6 py-2.5 rounded-full text-sm transition-colors">
              Ir al inicio
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-md border-b border-white/10 flex-shrink-0">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Flashealo</span>
          </div>
          <Link to={`/gallery/${event.slug}`}>
            <button className="text-white/40 hover:text-white text-sm transition-colors">
              Ver galería
            </button>
          </Link>
        </div>
      </header>

      <PhotoUploader eventId={event.id} eventSlug={event.slug} eventName={event.name} />
    </div>
  )
}
