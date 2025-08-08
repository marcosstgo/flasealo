import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
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
  const { user } = useAuth()
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
              Create New Event
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900">
              Event Details
            </h2>
            <p className="text-gray-600">
              Fill in the information about your event
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
                label="Event Name"
                placeholder="e.g., Sarah & John's Wedding"
                {...register('name', {
                  required: 'Event name is required',
                  minLength: {
                    value: 3,
                    message: 'Event name must be at least 3 characters',
                  },
                })}
                error={errors.name?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm transition-colors duration-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Tell guests more about your event..."
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
                  Make event gallery public (anyone with the link can view)
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  What happens next?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A unique QR code will be generated for your event</li>
                  <li>• Guests can scan the QR code to upload photos</li>
                  <li>• You can moderate photos before they appear in the gallery</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Create Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}