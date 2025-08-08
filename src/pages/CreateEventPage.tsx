import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Lock, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface CreateEventForm {
  name: string
  description: string
  is_public: boolean
}

export function CreateEventPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, canCreateEvents, isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventForm>({
    defaultValues: {
      is_public: true,
    },
  })

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!loading && user && !canCreateEvents && !isAdmin) {
      navigate('/dashboard')
    }
  }, [loading, user, canCreateEvents, isAdmin, navigate])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50)
  }

  const onSubmit = async (data: CreateEventForm) => {
    if (!user) return

    setIsLoading(true)
    setError('')

    try {
      const slug = generateSlug(data.name)
      
      // Check if slug is unique
      const { data: existingEvent } = await supabase
        .from('events')
        .select('slug')
        .eq('slug', slug)
        .single()

      let finalSlug = slug
      if (existingEvent) {
        finalSlug = `${slug}-${Date.now()}`
      }

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          name: data.name,
          description: data.description || null,
          is_public: data.is_public,
          slug: finalSlug,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      navigate(`/events/${newEvent.id}`)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  // No permission state
  if (!canCreateEvents && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Crear Nuevo Evento
              </h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Permiso Requerido
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Necesitas autorización del administrador para crear eventos. 
                Tu cuenta está registrada pero aún no tienes permisos para crear eventos.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-900 mb-1">
                      ¿Cómo obtener acceso?
                    </h4>
                    <p className="text-sm text-blue-800">
                      Contacta al administrador de la plataforma para solicitar 
                      permisos de creación de eventos. Una vez aprobado, podrás 
                      crear y gestionar tus propios eventos.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <Link to="/dashboard">
                  <Button variant="outline">
                    Volver al Dashboard
                  </Button>
                </Link>
                <Button onClick={() => window.location.href = 'mailto:admin@flashealo.com?subject=Solicitud de permisos para crear eventos'}>
                  Contactar Administrador
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
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Crear Nuevo Evento
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900">
              Detalles del Evento
            </h2>
            <p className="text-gray-600">
              Completa la información sobre tu evento
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Nombre del Evento"
                placeholder="ej: Boda de Sarah y John"
                {...register('name', {
                  required: 'El nombre del evento es requerido',
                  minLength: {
                    value: 3,
                    message: 'El nombre debe tener al menos 3 caracteres',
                  },
                })}
                error={errors.name?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Cuéntales más a los invitados sobre tu evento..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_public"
                  {...register('is_public')}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  Hacer la galería del evento pública (cualquiera con el enlace puede ver)
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  ¿Qué sucede después?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Se generará un código QR único para tu evento</li>
                  <li>• Los invitados pueden escanear el QR para subir fotos</li>
                  <li>• Puedes moderar las fotos antes de que aparezcan en la galería</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Crear Evento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}