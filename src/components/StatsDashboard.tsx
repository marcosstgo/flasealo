import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Camera, Clock, CheckCircle, TrendingUp } from 'lucide-react'
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
  dailyUploads: Array<{ date: string; uploads: number }>
}

export function StatsDashboard({ eventId }: StatsDashboardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: fetchEventStats,
    refetchInterval: 30000,
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

    const dailyUploads = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyUploads.push({
        date: date.toLocaleDateString('es-PR', { weekday: 'short' }),
        uploads: photos.filter(p => p.created_at.split('T')[0] === dateStr).length
      })
    }

    return {
      totalPhotos: photos.length,
      pendingPhotos: photos.filter(p => p.status === 'pending').length,
      approvedPhotos: photos.filter(p => p.status === 'approved').length,
      rejectedPhotos: photos.filter(p => p.status === 'rejected').length,
      uploadsToday: photos.filter(p => p.created_at.split('T')[0] === today).length,
      dailyUploads
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dark:bg-white/5 bg-[#faf9f7] px-6 py-5 animate-pulse">
            <div className="h-8 dark:bg-white/10 bg-gray-200 rounded mb-2 w-12" />
            <div className="h-3 dark:bg-white/5 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    { label: 'Total fotos', value: stats?.totalPhotos || 0, icon: Camera, valueColor: 'dark:text-white text-gray-900' },
    { label: 'Pendientes', value: stats?.pendingPhotos || 0, icon: Clock, valueColor: 'text-amber-400' },
    { label: 'Aprobadas', value: stats?.approvedPhotos || 0, icon: CheckCircle, valueColor: 'text-green-400' },
    { label: 'Hoy', value: stats?.uploadsToday || 0, icon: TrendingUp, valueColor: 'dark:text-white text-gray-900' },
  ]

  return (
    <div className="space-y-4">
      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden">
        {statCards.map((stat) => (
          <div key={stat.label} className="dark:bg-white/5 bg-[#faf9f7] px-6 py-5">
            <p className={`text-3xl font-light mb-1 ${stat.valueColor}`}>{stat.value}</p>
            <p className="dark:text-white/30 text-gray-400 text-xs uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 rounded-2xl p-5 dark:shadow-none shadow-sm">
        <p className="dark:text-white/40 text-gray-500 text-xs uppercase tracking-widest mb-4">Subidas últimos 7 días</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.dailyUploads || []} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(128,128,128,0.5)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(128,128,128,0.5)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              />
              <Bar dataKey="uploads" fill="rgba(255,255,255,0.6)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
