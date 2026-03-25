import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, Download, DownloadCloud, Copy, Check, Lock, Unlock, Camera, Shield, ShieldCheck } from 'lucide-react'
import { QRGenerator } from '../components/QRGenerator'
import { StatsDashboard } from '../components/StatsDashboard'
import { ImageModerationQueue } from '../components/ImageModerationQueue'
import { BulkDownloader } from '../components/BulkDownloader'
import { ThemeToggle } from '../components/ThemeToggle'
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
  auto_approve: boolean
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
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

  const handleToggleAutoApprove = () => {
    if (!event) return
    updateEventMutation.mutate({ auto_approve: !event.auto_approve })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 dark:border-white/40 border-gray-400" />
      </div>
    )
  }

  if (!event || event.user_id !== user?.id) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-light dark:text-white text-gray-900 mb-2">Evento no encontrado</h1>
          <p className="dark:text-white/40 text-gray-500 text-sm mb-6">No tienes acceso a este evento.</p>
          <Link to="/dashboard">
            <button className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
              Volver al Dashboard
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] dark:text-white text-gray-900">
      {/* Header */}
      <header className="dark:bg-black/60 bg-[#faf9f7]/90 backdrop-blur-md border-b dark:border-white/10 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <button className="dark:text-white/40 dark:hover:text-white text-gray-400 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 dark:bg-white bg-gray-900 rounded flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 dark:text-black text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-medium leading-tight">{event.name}</h1>
                  <p className="text-xs dark:text-white/30 text-gray-400">{event.is_public ? 'Evento público' : 'Evento privado'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to={`/gallery/${event.slug}`}>
                <button className="flex items-center gap-1.5 dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 text-xs px-3 py-1.5 rounded-full transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  Ver galería
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-1 space-y-4">

            {/* QR */}
            <QRGenerator eventSlug={event.slug} eventName={event.name} />

            {/* Share link */}
            <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm">
              <h3 className="font-medium mb-1">Compartir galería</h3>
              <p className="dark:text-white/40 text-gray-500 text-xs mb-4">Envía este link a tus clientes</p>
              <div className="flex items-center gap-2 dark:bg-black/30 bg-gray-50 dark:border dark:border-white/10 border border-gray-200 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs dark:text-white/50 text-gray-500 flex-1 truncate">{galleryUrl}</p>
                <button onClick={handleCopyLink} className="flex-shrink-0 dark:text-white/40 dark:hover:text-white text-gray-400 hover:text-gray-700 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full dark:border dark:border-white/15 dark:text-white/60 dark:hover:text-white dark:hover:border-white/30 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> ¡Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
              </button>
            </div>

            {/* Gallery settings */}
            <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm space-y-4">
              <h3 className="font-medium">Configuración</h3>

              {/* Auto-approve toggle */}
              <div className="flex items-center justify-between p-3 dark:bg-white/5 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${event.auto_approve ? 'bg-blue-500/20 text-blue-400' : 'dark:bg-white/10 bg-gray-200 dark:text-white/40 text-gray-500'}`}>
                    {event.auto_approve ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-aprobar</p>
                    <p className="text-xs dark:text-white/30 text-gray-400">
                      {event.auto_approve ? 'Fotos se publican al instante' : 'Requiere tu aprobación'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleAutoApprove}
                  disabled={updateEventMutation.isPending}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                    event.auto_approve
                      ? 'dark:border dark:border-white/20 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                  }`}
                >
                  {event.auto_approve ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {/* Downloads toggle */}
              <div className="flex items-center justify-between p-3 dark:bg-white/5 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${event.allow_downloads ? 'bg-green-500/20 text-green-400' : 'dark:bg-white/10 bg-gray-200 dark:text-white/40 text-gray-500'}`}>
                    {event.allow_downloads ? <Download className="w-4 h-4" /> : <DownloadCloud className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Descargas</p>
                    <p className="text-xs dark:text-white/30 text-gray-400">
                      {event.allow_downloads ? 'Invitados pueden descargar' : 'Solo vista'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleDownloads}
                  disabled={updateEventMutation.isPending}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                    event.allow_downloads
                      ? 'dark:border dark:border-white/20 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  }`}
                >
                  {event.allow_downloads ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {/* Password */}
              <div className="p-3 dark:bg-white/5 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${event.gallery_password ? 'bg-amber-500/20 text-amber-400' : 'dark:bg-white/10 bg-gray-200 dark:text-white/40 text-gray-500'}`}>
                      {event.gallery_password ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Contraseña</p>
                      <p className="text-xs dark:text-white/30 text-gray-400">
                        {event.gallery_password ? 'Galería protegida' : 'Galería pública'}
                      </p>
                    </div>
                  </div>
                  {event.gallery_password ? (
                    <button
                      onClick={handleRemovePassword}
                      disabled={updateEventMutation.isPending}
                      className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPasswordField(!showPasswordField)}
                      className="text-xs dark:border dark:border-white/20 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Activar
                    </button>
                  )}
                </div>

                {showPasswordField && !event.gallery_password && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Ej: boda2025"
                      onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                      className="flex-1 dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors"
                    />
                    <button
                      onClick={handleSetPassword}
                      disabled={updateEventMutation.isPending}
                      className="dark:bg-white dark:text-black bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {event.gallery_password && (
                  <p className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-3 py-2">
                    Contraseña: <strong>{event.gallery_password}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Bulk Download */}
            <BulkDownloader eventId={event.id} eventName={event.name} eventSlug={event.slug} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            <StatsDashboard eventId={event.id} />
            <ImageModerationQueue eventId={event.id} />
          </div>
        </div>
      </main>
    </div>
  )
}
