import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, Download, DownloadCloud, Copy, Check, Lock, Unlock } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { QRGenerator } from '../components/QRGenerator'
import { StatsDashboard } from '../components/StatsDashboard'
import { ImageModerationQueue } from '../components/ImageModerationQueue'
import { BulkDownloader } from '../components/BulkDownloader'
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
  gallery_password: string | null
}

export function EventManagePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)

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
    const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single()
    if (error) throw error
    return data
  }

  async function updateEvent(updates: Partial<Event>) {
    if (!eventId) throw new Error('Event ID is required')
    const { error } = await supabase.from('events').update(updates).eq('id', eventId)
    if (error) throw error
  }

  const galleryUrl = `${window.location.origin}/gallery/${event?.slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleDownloads = () => {
    if (!event) return
    updateEventMutation.mutate({ allow_downloads: !event.allow_downloads })
  }

  const handleSetPassword = () => {
    if (!passwordInput.trim()) return
    updateEventMutation.mutate({ gallery_password: passwordInput.trim() })
    setPasswordInput('')
    setShowPasswordField(false)
  }

  const handleRemovePassword = () => {
    updateEventMutation.mutate({ gallery_password: null })
    setShowPasswordField(false)
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evento no encontrado</h1>
          <p className="text-gray-600 mb-4">El evento que buscas no existe o no tienes acceso a él.</p>
          <Link to="/dashboard"><Button>Volver al Dashboard</Button></Link>
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
                <h1 className="text-xl font-semibold text-gray-900">{event.name}</h1>
                <p className="text-sm text-gray-600">{event.is_public ? 'Evento público' : 'Evento privado'}</p>
              </div>
            </div>
            <Link to={`/gallery/${event.slug}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Ver Galería
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <QRGenerator eventSlug={event.slug} eventName={event.name} />

            {/* Share link */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Compartir Galería</h3>
                <p className="text-sm text-gray-600">Envía este link a tus clientes</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-600 flex-1 truncate">{galleryUrl}</p>
                  <button
                    onClick={handleCopyLink}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <Button onClick={handleCopyLink} className="w-full" variant="outline" size="sm">
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2 text-green-600" /> ¡Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar link</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Gallery settings */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Configuración de Galería</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Downloads toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${event.allow_downloads ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {event.allow_downloads ? <Download className="w-5 h-5" /> : <DownloadCloud className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Descargas</h4>
                      <p className="text-sm text-gray-600">
                        {event.allow_downloads ? 'Invitados pueden descargar' : 'Solo vista'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleDownloads}
                    isLoading={updateEventMutation.isPending}
                    variant={event.allow_downloads ? 'outline' : 'primary'}
                    size="sm"
                  >
                    {event.allow_downloads ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>

                {/* Password protection */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${event.gallery_password ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                        {event.gallery_password ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Contraseña</h4>
                        <p className="text-sm text-gray-600">
                          {event.gallery_password ? 'Galería protegida' : 'Galería pública'}
                        </p>
                      </div>
                    </div>
                    {event.gallery_password ? (
                      <Button
                        onClick={handleRemovePassword}
                        isLoading={updateEventMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Quitar
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowPasswordField(!showPasswordField)}
                        variant="outline"
                        size="sm"
                      >
                        Activar
                      </Button>
                    )}
                  </div>

                  {showPasswordField && !event.gallery_password && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Ej: boda2025"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                      />
                      <Button size="sm" onClick={handleSetPassword} isLoading={updateEventMutation.isPending}>
                        Guardar
                      </Button>
                    </div>
                  )}

                  {event.gallery_password && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Contraseña: <strong>{event.gallery_password}</strong>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bulk Download */}
            <BulkDownloader eventId={event.id} eventName={event.name} eventSlug={event.slug} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-8">
            <StatsDashboard eventId={event.id} />
            <ImageModerationQueue eventId={event.id} />
          </div>
        </div>
      </main>
    </div>
  )
}
