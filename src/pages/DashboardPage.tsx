import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, LogOut, Calendar, Shield, Eye, Trash2, Camera, AlertCircle, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  is_public: boolean
  slug: string
  qr_code_url: string | null
  created_at: string
  photo_count?: number
  pending_photos?: number
  approved_photos?: number
}

interface DashboardStats {
  totalEvents: number
  totalPhotos: number
  pendingPhotos: number
  approvedPhotos: number
}

export function DashboardPage() {
  const { user, isAdmin, canCreateEvents, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: fetchUserEvents,
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      console.error(`Query attempt ${failureCount + 1} failed:`, error)
      return failureCount < 2
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: fetchDashboardStats,
    enabled: !!user?.id && events !== undefined,
    retry: 1,
  })

  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onMutate: (eventId) => { setDeletingEventId(eventId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-events'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDeletingEventId(null)
    },
    onError: (error) => {
      console.error('Error deleting event:', error)
      setDeletingEventId(null)
      alert('Error al eliminar el evento. Por favor intenta de nuevo.')
    },
  })

  async function fetchUserEvents(): Promise<Event[]> {
    if (!user?.id) throw new Error('Usuario no autenticado')

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select(`id, name, description, is_public, slug, qr_code_url, created_at, updated_at, photos(status)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (eventsError) throw new Error(`Error al cargar eventos: ${eventsError.message}`)
    if (!eventsData || eventsData.length === 0) return []

    return eventsData.map((event) => {
      const photos = (event.photos as { status: string }[]) || []
      return {
        ...event,
        photos: undefined,
        photo_count: photos.length,
        pending_photos: photos.filter(p => p.status === 'pending').length,
        approved_photos: photos.filter(p => p.status === 'approved').length,
      }
    })
  }

  async function fetchDashboardStats(): Promise<DashboardStats> {
    if (!user?.id || !events) return { totalEvents: 0, totalPhotos: 0, pendingPhotos: 0, approvedPhotos: 0 }
    return {
      totalEvents: events.length,
      totalPhotos: events.reduce((sum, e) => sum + (e.photo_count || 0), 0),
      pendingPhotos: events.reduce((sum, e) => sum + (e.pending_photos || 0), 0),
      approvedPhotos: events.reduce((sum, e) => sum + (e.approved_photos || 0), 0),
    }
  }

  async function deleteEvent(eventId: string) {
    if (!user?.id) throw new Error('Usuario no autenticado')
    const { error } = await supabase.from('events').delete().eq('id', eventId).eq('user_id', user.id)
    if (error) throw new Error(`Error al eliminar evento: ${error.message}`)
  }

  const handleSignOut = async () => {
    try { await signOut(); navigate('/') } catch (error) { console.error('Error signing out:', error) }
  }

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar el evento "${eventName}"?\n\nEsta acción eliminará el evento, todas las fotos asociadas y el código QR.\n\nEsta acción no se puede deshacer.`
    )
    if (confirmed) deleteEventMutation.mutate(eventId)
  }

  const handleRetryLoad = () => {
    queryClient.invalidateQueries({ queryKey: ['user-events'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  if (eventsLoading) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7]">
        <header className="dark:bg-black/40 bg-[#faf9f7]/80 backdrop-blur-md border-b dark:border-white/10 border-gray-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
                <Camera className="w-4 h-4 dark:text-black text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight dark:text-white text-gray-900">Flashealo</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 dark:border-white/40 border-gray-400 mx-auto mb-4" />
            <p className="dark:text-white/40 text-gray-400">Cargando tus eventos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (eventsError) {
    return (
      <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] dark:text-white text-gray-900">
        <header className="dark:bg-black/40 bg-[#faf9f7]/80 backdrop-blur-md border-b dark:border-white/10 border-gray-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
                <Camera className="w-4 h-4 dark:text-black text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Flashealo</span>
            </div>
          </div>
        </header>
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 dark:text-white/30 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error al cargar el dashboard</h3>
          <p className="dark:text-white/40 text-gray-500 mb-6 text-sm">
            {eventsError instanceof Error ? eventsError.message : 'Error desconocido'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleRetryLoad} className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
              Reintentar
            </button>
            <button onClick={() => window.location.reload()} className="dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 text-sm px-5 py-2.5 rounded-full transition-colors">
              Recargar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] dark:text-white text-gray-900">
      {/* Header */}
      <header className="dark:bg-black/40 bg-[#faf9f7]/80 backdrop-blur-md border-b dark:border-white/10 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
              <Camera className="w-4 h-4 dark:text-black text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Flashealo</span>
          </Link>
          <div className="flex items-center space-x-3">
            <span className="text-sm dark:text-white/30 text-gray-400 hidden sm:block">{user?.email}</span>
            <ThemeToggle />
            {isAdmin && (
              <Link to="/admin">
                <button className="dark:text-white/50 dark:hover:text-white text-gray-500 hover:text-gray-900 text-sm transition-colors flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </Link>
            )}
            <button onClick={handleSignOut} className="dark:text-white/30 dark:hover:text-white text-gray-400 hover:text-gray-900 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Permission notice */}
        {!canCreateEvents && !isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-10 flex items-start gap-4">
            <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 font-medium mb-1">Cuenta pendiente de aprobación</p>
              <p className="text-amber-200/60 text-sm mb-3">
                Necesitas autorización para crear eventos. Puedes gestionar los existentes normalmente.
              </p>
              <button
                onClick={() => window.location.href = 'mailto:hello@marcossantiago.com?subject=Solicitud de permisos para crear eventos'}
                className="text-amber-300 text-sm border border-amber-500/30 px-4 py-1.5 rounded-full hover:bg-amber-500/10 transition-colors"
              >
                Solicitar acceso
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden mb-10">
            {[
              { label: 'Eventos', value: stats.totalEvents },
              { label: 'Fotos totales', value: stats.totalPhotos },
              { label: 'Pendientes', value: stats.pendingPhotos },
              { label: 'Aprobadas', value: stats.approvedPhotos },
            ].map((stat) => (
              <div key={stat.label} className="dark:bg-white/5 bg-[#faf9f7] px-6 py-5">
                <p className="text-3xl font-light mb-1">{stat.value}</p>
                <p className="dark:text-white/30 text-gray-400 text-xs uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Events header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-light">Tus eventos</h1>
          {(canCreateEvents || isAdmin) ? (
            <Link to="/create-event">
              <button className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nuevo evento
              </button>
            </Link>
          ) : (
            <button disabled className="dark:border dark:border-white/10 dark:text-white/20 border border-gray-200 text-gray-300 text-sm px-5 py-2.5 rounded-full flex items-center gap-2 cursor-not-allowed">
              <Lock className="w-4 h-4" />
              Nuevo evento
            </button>
          )}
        </div>

        {/* Events grid */}
        {!events || events.length === 0 ? (
          <div className="dark:border dark:border-white/10 border border-gray-200 rounded-2xl text-center py-24">
            <Calendar className="w-10 h-10 dark:text-white/10 text-gray-300 mx-auto mb-4" />
            <p className="dark:text-white/30 text-gray-400 mb-6">
              {canCreateEvents || isAdmin
                ? 'Crea tu primer evento para comenzar'
                : 'Una vez aprobado podrás crear eventos'}
            </p>
            {(canCreateEvents || isAdmin) && (
              <Link to="/create-event">
                <button className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                  Crear primer evento
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div key={event.id} className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-6 hover:dark:bg-white/[0.08] hover:bg-gray-50 transition-colors group shadow-sm dark:shadow-none">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate mb-1">{event.name}</h3>
                    {event.description && (
                      <p className="dark:text-white/30 text-gray-400 text-sm line-clamp-1">{event.description}</p>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 ml-3 flex-shrink-0 ${event.is_public ? 'bg-green-400' : 'dark:bg-white/20 bg-gray-300'}`} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="dark:bg-white/5 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-light">{event.photo_count || 0}</p>
                    <p className="dark:text-white/30 text-gray-400 text-xs">fotos</p>
                  </div>
                  <div className="dark:bg-white/5 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-amber-400 text-lg font-light">{event.pending_photos || 0}</p>
                    <p className="dark:text-white/30 text-gray-400 text-xs">pendientes</p>
                  </div>
                  <div className="dark:bg-white/5 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-green-400 text-lg font-light">{event.approved_photos || 0}</p>
                    <p className="dark:text-white/30 text-gray-400 text-xs">aprobadas</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link to={`/events/${event.id}`} className="flex-1">
                    <button className="w-full dark:bg-white dark:text-black bg-gray-900 text-white text-xs font-medium py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Gestionar
                    </button>
                  </Link>
                  <Link to={`/gallery/${event.slug}`}>
                    <button className="dark:border dark:border-white/10 dark:text-white/50 dark:hover:text-white dark:hover:border-white/30 border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 px-3 py-2 rounded-xl transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    className="dark:border dark:border-white/10 dark:text-white/30 dark:hover:text-red-400 dark:hover:border-red-500/30 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 px-3 py-2 rounded-xl transition-colors"
                  >
                    {deletingEventId === event.id ? (
                      <div className="w-3.5 h-3.5 border dark:border-white/30 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="dark:text-white/20 text-gray-400 text-xs mt-3">
                  {new Date(event.created_at).toLocaleDateString('es-PR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
