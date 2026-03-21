import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, LogOut, Calendar, Shield, Eye, Edit, Trash2, Users, Camera, AlertCircle, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
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

  // Fetch user events with better error handling
  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['user-events', user?.id],
    queryFn: fetchUserEvents,
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      console.error(`Query attempt ${failureCount + 1} failed:`, error)
      return failureCount < 2
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: fetchDashboardStats,
    enabled: !!user?.id && events !== undefined,
    retry: 1,
  })

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onMutate: (eventId) => {
      setDeletingEventId(eventId)
    },
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
      .select(`
        id,
        name,
        description,
        is_public,
        slug,
        qr_code_url,
        created_at,
        updated_at,
        photos(status)
      `)
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
    if (!user?.id || !events) {
      return {
        totalEvents: 0,
        totalPhotos: 0,
        pendingPhotos: 0,
        approvedPhotos: 0
      }
    }

    try {
      const totalEvents = events.length
      const totalPhotos = events.reduce((sum, event) => sum + (event.photo_count || 0), 0)
      const pendingPhotos = events.reduce((sum, event) => sum + (event.pending_photos || 0), 0)
      const approvedPhotos = events.reduce((sum, event) => sum + (event.approved_photos || 0), 0)

      return {
        totalEvents,
        totalPhotos,
        pendingPhotos,
        approvedPhotos
      }
    } catch (error) {
      console.error('Error calculating dashboard stats:', error)
      return {
        totalEvents: 0,
        totalPhotos: 0,
        pendingPhotos: 0,
        approvedPhotos: 0
      }
    }
  }

  async function deleteEvent(eventId: string) {
    if (!user?.id) throw new Error('Usuario no autenticado')

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (error) throw new Error(`Error al eliminar evento: ${error.message}`)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar el evento "${eventName}"?\n\nEsta acción eliminará:\n- El evento\n- Todas las fotos asociadas\n- El código QR\n\nEsta acción no se puede deshacer.`
    )
    
    if (confirmed) {
      deleteEventMutation.mutate(eventId)
    }
  }

  const handleRetryLoad = () => {
    queryClient.invalidateQueries({ queryKey: ['user-events'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // Loading state
  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Panel de Control
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando tus eventos...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (eventsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Panel de Control
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error al cargar el dashboard
              </h3>
              <p className="text-gray-600 mb-2">
                {eventsError instanceof Error ? eventsError.message : 'Error desconocido'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Hubo un problema al cargar tus eventos. Por favor intenta de nuevo.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRetryLoad}>
                  Reintentar
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Recargar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <Camera className="w-4 h-4 text-black" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Flashealo</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white/30 hidden sm:block">{user?.email}</span>
            {isAdmin && (
              <Link to="/admin">
                <button className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </Link>
            )}
            <button onClick={handleSignOut} className="text-white/30 hover:text-white transition-colors">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden mb-10">
            {[
              { label: 'Eventos', value: stats.totalEvents },
              { label: 'Fotos totales', value: stats.totalPhotos },
              { label: 'Pendientes', value: stats.pendingPhotos },
              { label: 'Aprobadas', value: stats.approvedPhotos },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 px-6 py-5">
                <p className="text-3xl font-light text-white mb-1">{stat.value}</p>
                <p className="text-white/30 text-xs uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Events header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-light text-white">Tus eventos</h1>
          </div>
          {(canCreateEvents || isAdmin) ? (
            <Link to="/create-event">
              <button className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nuevo evento
              </button>
            </Link>
          ) : (
            <button disabled className="border border-white/10 text-white/20 text-sm px-5 py-2.5 rounded-full flex items-center gap-2 cursor-not-allowed">
              <Lock className="w-4 h-4" />
              Nuevo evento
            </button>
          )}
        </div>

        {/* Events grid */}
        {!events || events.length === 0 ? (
          <div className="border border-white/10 rounded-2xl text-center py-24">
            <Calendar className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 mb-6">
              {canCreateEvents || isAdmin
                ? 'Crea tu primer evento para comenzar'
                : 'Una vez aprobado podrás crear eventos'}
            </p>
            {(canCreateEvents || isAdmin) && (
              <Link to="/create-event">
                <button className="bg-white text-black text-sm font-medium px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors">
                  Crear primer evento
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div key={event.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate mb-1">{event.name}</h3>
                    {event.description && (
                      <p className="text-white/30 text-sm line-clamp-1">{event.description}</p>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 ml-3 flex-shrink-0 ${event.is_public ? 'bg-green-400' : 'bg-white/20'}`} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-white text-lg font-light">{event.photo_count || 0}</p>
                    <p className="text-white/30 text-xs">fotos</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-amber-400 text-lg font-light">{event.pending_photos || 0}</p>
                    <p className="text-white/30 text-xs">pendientes</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-green-400 text-lg font-light">{event.approved_photos || 0}</p>
                    <p className="text-white/30 text-xs">aprobadas</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link to={`/events/${event.id}`} className="flex-1">
                    <button className="w-full bg-white text-black text-xs font-medium py-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Gestionar
                    </button>
                  </Link>
                  <Link to={`/gallery/${event.slug}`}>
                    <button className="border border-white/10 text-white/50 hover:text-white hover:border-white/30 px-3 py-2 rounded-xl transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    className="border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 px-3 py-2 rounded-xl transition-colors"
                  >
                    {deletingEventId === event.id ? (
                      <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-white/20 text-xs mt-3">
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