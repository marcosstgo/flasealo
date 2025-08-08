import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, LogOut, Calendar, Shield, Eye, Edit, Trash2, Users, Camera, AlertCircle } from 'lucide-react'
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
  const { user, isAdmin, signOut } = useAuth()
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
    if (!user?.id) {
      console.error('No user ID available for fetching events')
      throw new Error('Usuario no autenticado')
    }

    try {
      console.log('Fetching events for user:', user.id)

      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('events')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('Database connection test failed:', testError)
        throw new Error(`Error de conexión a la base de datos: ${testError.message}`)
      }

      // Fetch user events
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
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
        throw new Error(`Error al cargar eventos: ${eventsError.message}`)
      }

      console.log('Events fetched successfully:', eventsData?.length || 0, 'events')

      if (!eventsData || eventsData.length === 0) {
        console.log('No events found for user')
        return []
      }

      // Fetch photo counts for each event
      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          try {
            const { data: photos, error: photosError } = await supabase
              .from('photos')
              .select('status')
              .eq('event_id', event.id)

            if (photosError) {
              console.warn(`Error fetching photos for event ${event.id}:`, photosError)
              return {
                ...event,
                photo_count: 0,
                pending_photos: 0,
                approved_photos: 0
              }
            }

            const photoCount = photos?.length || 0
            const pendingPhotos = photos?.filter(p => p.status === 'pending').length || 0
            const approvedPhotos = photos?.filter(p => p.status === 'approved').length || 0

            return {
              ...event,
              photo_count: photoCount,
              pending_photos: pendingPhotos,
              approved_photos: approvedPhotos
            }
          } catch (error) {
            console.warn(`Error processing event ${event.id}:`, error)
            return {
              ...event,
              photo_count: 0,
              pending_photos: 0,
              approved_photos: 0
            }
          }
        })
      )

      console.log('Events with photo counts calculated successfully')
      return eventsWithCounts
    } catch (error) {
      console.error('Error in fetchUserEvents:', error)
      throw error
    }
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
    if (!user?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      console.log('Deleting event:', eventId)

      // Delete the event (CASCADE will handle photos)
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id) // Extra security check

      if (eventError) {
        console.error('Error deleting event:', eventError)
        throw new Error(`Error al eliminar evento: ${eventError.message}`)
      }

      console.log('Event deleted successfully')
    } catch (error) {
      console.error('Error in deleteEvent:', error)
      throw error
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Panel de Control
              </span>
            </Link>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Total Eventos
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalEvents}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Total Fotos
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalPhotos}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Fotos Pendientes
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.pendingPhotos}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <Settings className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Fotos Aprobadas
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.approvedPhotos}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Events Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tus Eventos</h1>
            <p className="text-gray-600">Gestiona tus eventos de compartir fotos</p>
          </div>
          <Link to="/create-event">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Evento
            </Button>
          </Link>
        </div>

        {/* Events Grid */}
        {!events || events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aún no tienes eventos
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer evento para comenzar a recopilar fotos
              </p>
              <Link to="/create-event">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Tu Primer Evento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {event.name}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <div className={`w-2 h-2 rounded-full ${
                        event.is_public ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {event.is_public ? 'Público' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total fotos:</span>
                      <span className="font-medium">{event.photo_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pendientes:</span>
                      <span className="font-medium text-orange-600">{event.pending_photos || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Aprobadas:</span>
                      <span className="font-medium text-green-600">{event.approved_photos || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Creado:</span>
                      <span className="font-medium">
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Link to={`/events/${event.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-1" />
                        Gestionar
                      </Button>
                    </Link>
                    <Link to={`/gallery/${event.slug}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id, event.name)}
                      isLoading={deletingEventId === event.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}