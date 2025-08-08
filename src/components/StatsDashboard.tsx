import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Camera, Users, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from './ui/Card'
import { supabase } from '../lib/supabase'

interface StatsDashboardProps {
  eventId: string
}

interface EventStats {
  totalPhotos: number
  pendingPhotos: number
  approvedPhotos: number
  rejectedPhotos: number
  uploadsToday: number
  uploadsThisWeek: number
  dailyUploads: Array<{
    date: string
    uploads: number
  }>
}

export function StatsDashboard({ eventId }: StatsDashboardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: fetchEventStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  async function fetchEventStats(): Promise<EventStats> {
    const { data: photos, error } = await supabase
      .from('photos')
      .select('status, created_at')
      .eq('event_id', eventId)

    if (error) throw error

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const totalPhotos = photos.length
    const pendingPhotos = photos.filter(p => p.status === 'pending').length
    const approvedPhotos = photos.filter(p => p.status === 'approved').length
    const rejectedPhotos = photos.filter(p => p.status === 'rejected').length
    const uploadsToday = photos.filter(p => p.created_at.split('T')[0] === today).length
    const uploadsThisWeek = photos.filter(p => p.created_at.split('T')[0] >= weekAgo).length

    // Daily uploads for chart
    const dailyUploads = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const uploads = photos.filter(p => p.created_at.split('T')[0] === dateStr).length
      dailyUploads.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        uploads
      })
    }

    return {
      totalPhotos,
      pendingPhotos,
      approvedPhotos,
      rejectedPhotos,
      uploadsToday,
      uploadsThisWeek,
      dailyUploads
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Photos',
      value: stats?.totalPhotos || 0,
      icon: Camera,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending Review',
      value: stats?.pendingPhotos || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Approved',
      value: stats?.approvedPhotos || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Today',
      value: stats?.uploadsToday || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Daily Uploads (Last 7 Days)
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyUploads || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uploads" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}