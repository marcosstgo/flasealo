import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Calendar, 
  Camera, 
  Settings, 
  LogOut, 
  Shield, 
  Eye, 
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  Info
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface AdminStats {
  totalUsers: number
  totalEvents: number
  totalPhotos: number
  pendingPhotos: number
}

interface EventWithUser {
  id: string
  name: string
  description: string | null
  is_public: boolean
  slug: string
  user_id: string
  created_at: string
  photo_count: number
  user_email: string
}

interface UserWithRole {
  id: string
  email: string
  created_at: string
  role: 'user' | 'admin'
  event_count: number
}

export function AdminDashboardPage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events', searchTerm],
    queryFn: () => fetchAllEvents(searchTerm),
    enabled: activeTab === 'events',
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: () => fetchAllUsers(searchTerm),
    enabled: activeTab === 'users',
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  async function fetchAdminStats(): Promise<AdminStats> {
    try {
      const [usersResult, eventsResult, photosResult] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact' }),
        supabase.from('events').select('*', { count: 'exact' }),
        supabase.from('photos').select('status', { count: 'exact' })
      ])

      const totalUsers = usersResult.count || 0
      const totalEvents = eventsResult.count || 0
      const totalPhotos = photosResult.count || 0
      const pendingPhotos = photosResult.data?.filter(p => p.status === 'pending').length || 0

      return {
        totalUsers,
        totalEvents,
        totalPhotos,
        pendingPhotos
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      return {
        totalUsers: 0,
        totalEvents: 0,
        totalPhotos: 0,
        pendingPhotos: 0
      }
    }
  }

  async function fetchAllEvents(search: string = ''): Promise<EventWithUser[]> {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          photos(count)
        `)
        .order('created_at', { ascending: false })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data: events, error } = await query

      if (error) throw error

      // For now, we'll show events without user emails since we can't safely access auth.admin
      // In a production environment, this would be handled by a secure Edge Function
      return events.map(event => ({
        ...event,
        photo_count: event.photos?.[0]?.count || 0,
        user_email: 'Email no disponible (requiere Edge Function)'
      }))
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  async function fetchAllUsers(search: string = ''): Promise<UserWithRole[]> {
    try {
      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')

      // Get event counts per user
      const { data: eventCounts } = await supabase
        .from('events')
        .select('user_id')

      const eventCountMap = new Map()
      eventCounts?.forEach(event => {
        eventCountMap.set(event.user_id, (eventCountMap.get(event.user_id) || 0) + 1)
      })

      // Create user list from roles table since we can't safely access auth.admin
      let users: UserWithRole[] = roles?.map(role => ({
        id: role.user_id,
        email: 'Email no disponible (requiere Edge Function)',
        created_at: role.created_at,
        role: role.role,
        event_count: eventCountMap.get(role.user_id) || 0
      })) || []

      if (search) {
        // Since we don't have emails, we'll search by user ID
        users = users.filter(user => 
          user.id.toLowerCase().includes(search.toLowerCase())
        )
      }

      return users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  async function updateUserRole({ userId, role }: { userId: string; role: 'user' | 'admin' }) {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role })

    if (error) throw error
  }

  async function deleteEvent(eventId: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) throw error
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const statCards = [
    {
      title: 'Total Usuarios',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Eventos',
      value: stats?.totalEvents || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Fotos',
      value: stats?.totalPhotos || 0,
      icon: Camera,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Fotos Pendientes',
      value: stats?.pendingPhotos || 0,
      icon: Settings,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Panel de Administrador
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Link to="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard Usuario
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Resumen', icon: Settings },
              { id: 'events', label: 'Eventos', icon: Calendar },
              { id: 'users', label: 'Usuarios', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resumen del Sistema</h1>
              <p className="text-gray-600">Vista general de la plataforma Flashealo</p>
            </div>

            {/* Security Notice */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Nota de Seguridad
                    </h3>
                    <div className="text-blue-700 space-y-2">
                      <p>Para mayor seguridad, algunas funciones administrativas requieren la implementación de Supabase Edge Functions:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Visualización de emails de usuarios</li>
                        <li>Gestión avanzada de usuarios</li>
                        <li>Operaciones que requieren privilegios de administrador</li>
                      </ul>
                      <p className="text-sm">Actualmente estas funciones están limitadas por razones de seguridad.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bgColor}`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Admin Features */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Funcionalidades del Panel de Administrador
                    </h3>
                    <div className="text-yellow-700 space-y-2">
                      <p><strong>Gestión de Eventos:</strong> Visualiza, edita y elimina eventos de todos los usuarios.</p>
                      <p><strong>Gestión de Usuarios:</strong> Administra roles de usuario (usuario/admin) y visualiza estadísticas.</p>
                      <p><strong>Moderación de Contenido:</strong> Accede a las herramientas de moderación desde la gestión de eventos individuales.</p>
                      <p><strong>Estadísticas Globales:</strong> Monitorea el uso general de la plataforma.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
                <p className="text-gray-600">Administra todos los eventos de la plataforma</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {eventsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-20 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {events?.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {event.name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              event.is_public 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.is_public ? 'Público' : 'Privado'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Creado por: {event.user_email}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{event.photo_count} fotos</span>
                            <span>Creado: {new Date(event.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link to={`/gallery/${event.slug}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/events/${event.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
                                deleteEventMutation.mutate(event.id)
                              }
                            }}
                            isLoading={deleteEventMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {events?.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No se encontraron eventos
                      </h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no hay eventos creados en la plataforma'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-gray-600">Administra usuarios y sus roles</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Buscar por ID de usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {users?.map((userData) => (
                  <Card key={userData.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {userData.email}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              userData.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userData.role === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 font-mono">
                            ID: {userData.id}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{userData.event_count} eventos</span>
                            <span>Registrado: {new Date(userData.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRoleMutation.mutate({
                              userId: userData.id,
                              role: userData.role === 'admin' ? 'user' : 'admin'
                            })}
                            isLoading={updateUserRoleMutation.isPending}
                            disabled={userData.id === user?.id}
                          >
                            {userData.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {users?.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No se encontraron usuarios
                      </h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no hay usuarios registrados'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}