import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Settings, Share2, Eye, Download, DownloadCloud } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { QRGenerator } from '../components/QRGenerator'
import { StatsDashboard } from '../components/StatsDashboard'
import { ImageModerationQueue } from '../components/ImageModerationQueue'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  is_public: boolean
  slug: string
  user_id: string
  allow_downloads: boolean
}

export function EventManagePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: fetchEvent,
    enabled: !!eventId,
  })

  const updateEventMutation = useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })

  async function fetchEvent(): Promise<Event> {
    if (!eventId) throw new Error('Event ID is required')

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) throw error
    return data
  }

  async function updateEvent(updates: Partial<Event>) {
    if (!eventId) throw new Error('Event ID is required')

    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)

    if (error) throw error
  }

  const handleToggleDownloads = () => {
    if (!event) return
    
    updateEventMutation.mutate({
      allow_downloads: !event.allow_downloads
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!event || event.user_id !== user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Event not found
          </h1>
          <p className="text-gray-600 mb-4">
            The event you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard">
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {event.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {event.is_public ? 'Public Event' : 'Private Event'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to={`/gallery/${event.slug}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Gallery
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - QR Code and Settings */}
          <div className="lg:col-span-1 space-y-6">
            <QRGenerator eventSlug={event.slug} eventName={event.name} />
            
            {/* Download Control Settings */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuración de Galería
                </h3>
                <p className="text-sm text-gray-600">
                  Controla cómo los visitantes interactúan con las fotos
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      event.allow_downloads 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {event.allow_downloads ? (
                        <Download className="w-5 h-5" />
                      ) : (
                        <DownloadCloud className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Descarga de Fotos
                      </h4>
                      <p className="text-sm text-gray-600">
                        {event.allow_downloads 
                          ? 'Los visitantes pueden descargar fotos'
                          : 'Los visitantes solo pueden ver las fotos'
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleDownloads}
                    isLoading={updateEventMutation.isPending}
                    variant={event.allow_downloads ? "outline" : "primary"}
                    size="sm"
                  >
                    {event.allow_downloads ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> Cuando las descargas están desactivadas, 
                    los visitantes podrán ver las fotos en la galería pero no tendrán 
                    la opción de descargarlas individualmente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats and Management */}
          <div className="lg:col-span-2 space-y-8">
            <StatsDashboard eventId={event.id} />
            <ImageModerationQueue eventId={event.id} />
          </div>
        </div>
      </main>
    </div>
  )
}