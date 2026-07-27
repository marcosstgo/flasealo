import React, { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Camera, ArrowLeft, Heart, Download, Upload, Search, Images, Trophy, Gift } from 'lucide-react'
import { PhotoViewer } from '../components/PhotoViewer'
import { ThemeToggle } from '../components/ThemeToggle'
import { FilterBar, DateFilter, SortOrder } from '../components/FilterBar'
import { supabase } from '../lib/supabase'

interface Event {
  id: string
  name: string
  description: string | null
  slug: string
  is_public: boolean
  allow_downloads: boolean
  has_password: boolean
  raffle_enabled: boolean
  raffle_winner_name: string | null
  raffle_drawn_at: string | null
}

interface Photo {
  id: string
  image_path: string
  thumbnail_url: string | null
  created_at: string
  format: string
  size: number
  uploader_name: string | null
}

const DEMO_PHOTOS: Photo[] = [
  { id: '1',  image_path: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Ana' },
  { id: '2',  image_path: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Carlos' },
  { id: '3',  image_path: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
  { id: '4',  image_path: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'María' },
  { id: '5',  image_path: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Pedro' },
  { id: '6',  image_path: 'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
  { id: '7',  image_path: 'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Laura' },
  { id: '8',  image_path: 'https://images.pexels.com/photos/1444416/pexels-photo-1444416.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
  { id: '9',  image_path: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Sofía' },
  { id: '10', image_path: 'https://images.pexels.com/photos/3014853/pexels-photo-3014853.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Diego' },
  { id: '11', image_path: 'https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Valeria' },
  { id: '12', image_path: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800',    created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: null },
  { id: '13', image_path: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Rodrigo' },
  { id: '14', image_path: 'https://images.pexels.com/photos/2291367/pexels-photo-2291367.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Isabella' },
  { id: '15', image_path: 'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=800',  created_at: new Date().toISOString(), format: 'image/jpeg', size: 1024000, uploader_name: 'Tomás' },
]

export function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [passwordInput, setPasswordInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [passwordError, setPasswordError] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event-by-slug', eventSlug],
    queryFn: fetchEventBySlug,
    enabled: !!eventSlug,
  })

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['gallery-photos', event?.id],
    queryFn: fetchApprovedPhotos,
    enabled: !!event?.id,
  })

  async function fetchEventBySlug(): Promise<Event> {
    if (!eventSlug) throw new Error('Event slug is required')

    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, slug, is_public, allow_downloads, gallery_password, raffle_enabled, raffle_winner_name, raffle_drawn_at')
      .eq('slug', eventSlug)
      .eq('is_public', true)
      .single()

    if (error) throw error
    return { ...data, has_password: !!data.gallery_password, gallery_password: undefined }
  }

  async function fetchApprovedPhotos(): Promise<Photo[]> {
    if (!event?.id) return []

    const { data, error } = await supabase
      .from('photos')
      .select('id, image_path, thumbnail_url, created_at, format, size, uploader_name')
      .eq('event_id', event.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data.length === 0 && eventSlug === 'demo-event') return DEMO_PHOTOS
    return data
  }

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('https://')) return imagePath
    const { data } = supabase.storage.from('event-photos').getPublicUrl(imagePath)
    return data.publicUrl
  }

  const getThumbnailUrl = (photo: Photo) => {
    if (photo.thumbnail_url) return photo.thumbnail_url
    return getImageUrl(photo.image_path)
  }

  const downloadImage = async (imageUrl: string, photoId: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `flashealo-${event?.slug}-${photoId}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index)
    setViewerOpen(true)
  }

  const filteredAndSortedPhotos = useMemo(() => {
    if (!photos) return []

    let filtered = [...photos]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((photo) =>
        photo.uploader_name?.toLowerCase().includes(query)
      )
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter((photo) => {
        const photoDate = new Date(photo.created_at)
        switch (dateFilter) {
          case 'today':
            return photoDate >= today
          case 'week': {
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return photoDate >= weekAgo
          }
          case 'month': {
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return photoDate >= monthAgo
          }
          default:
            return true
        }
      })
    }

    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name':
        filtered.sort((a, b) => {
          const nameA = a.uploader_name?.toLowerCase() || 'zzz'
          const nameB = b.uploader_name?.toLowerCase() || 'zzz'
          return nameA.localeCompare(nameB)
        })
        break
    }

    return filtered
  }, [photos, searchQuery, dateFilter, sortOrder])

  if (eventLoading) {
    return (
      <div className="min-h-screen dark:bg-[#0a0a0a] bg-[#f8f7f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent dark:border-t-white/40 border-t-gray-400" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen dark:bg-[#0a0a0a] bg-[#f8f7f5] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-7 h-7 dark:text-white/20 text-gray-300" />
          </div>
          <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-3">Evento No Encontrado</h1>
          <p className="dark:text-white/40 text-gray-500 text-sm mb-8 leading-relaxed">
            El evento que buscas no existe o no está disponible públicamente.
          </p>
          <Link to="/">
            <button className="dark:border dark:border-white/15 dark:text-white/50 dark:hover:text-white dark:hover:border-white/30 border border-gray-300 text-gray-500 hover:text-gray-900 px-6 py-2.5 rounded-full transition-all text-sm">
              Volver al Inicio
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const needsPassword = event?.has_password && eventSlug !== 'demo-event' && !unlocked

  const handleUnlock = async () => {
    if (!eventSlug || !passwordInput) return
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-gallery-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ eventSlug, password: passwordInput }),
      })
      const { valid } = await res.json()
      if (valid) {
        setUnlocked(true)
        setPasswordError(false)
      } else {
        setPasswordError(true)
      }
    } catch {
      setPasswordError(true)
    }
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen dark:bg-[#0a0a0a] bg-[#f8f7f5] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-10">
            <div className="w-12 h-12 dark:bg-white/5 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Camera className="w-5 h-5 dark:text-white/40 text-gray-400" />
            </div>
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">{event.name}</h1>
            <p className="dark:text-white/30 text-gray-400 text-sm">Esta galería está protegida con contraseña</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
              placeholder="Ingresa la contraseña"
              className="w-full dark:bg-white/5 bg-white dark:border dark:border-white/10 border border-gray-200 dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 rounded-xl px-4 py-3.5 text-center focus:outline-none dark:focus:border-white/30 focus:border-gray-400 transition-colors text-sm"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-xs">Contraseña incorrecta. Inténtalo de nuevo.</p>
            )}
            <button
              onClick={handleUnlock}
              className="w-full dark:bg-white dark:text-gray-900 bg-gray-900 text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Abrir galería
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isDemo = eventSlug === 'demo-event'

  return (
    <div className="min-h-screen dark:bg-[#0a0a0a] bg-[#f8f7f5]">

      {/* Hero header */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt={event.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

        {/* Sticky nav strip */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link to="/">
                <button className="text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline tracking-widest uppercase text-xs font-medium">Flashealo</span>
                </button>
              </Link>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                {!event.allow_downloads && (
                  <span className="text-xs bg-white/10 text-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15">
                    Solo vista
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Event title overlay */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            {isDemo && (
              <span className="inline-block text-xs uppercase tracking-widest text-white/50 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 rounded-full mb-3">
                Demo
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight leading-tight mb-2">
              {event.name}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              {event.description && (
                <p className="text-white/50 text-sm max-w-lg">{event.description}</p>
              )}
              <div className="ml-auto flex items-center gap-1.5 text-white/50 text-sm shrink-0">
                <Heart className="w-3.5 h-3.5" />
                <span>{photos?.length ?? 0} fotos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {photos && photos.length > 0 && (
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          totalPhotos={photos.length}
          filteredCount={filteredAndSortedPhotos.length}
        />
      )}

      {/* Raffle banner / winner */}
      {!isDemo && event.raffle_enabled && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {event.raffle_drawn_at && event.raffle_winner_name ? (
            <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-400 font-medium uppercase tracking-widest mb-0.5">Ganador del sorteo</p>
                <p className="text-lg font-medium dark:text-white text-gray-900">{event.raffle_winner_name}</p>
                <p className="text-xs dark:text-white/30 text-gray-400">
                  Sorteado el {new Date(event.raffle_drawn_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-3.5">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm dark:text-white/60 text-gray-600">
                <span className="text-amber-400 font-medium">Sorteo activo</span> — cada foto subida es una entrada. ¡Más fotos, más posibilidades de ganar!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Demo notice */}
      {isDemo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-3 dark:bg-white/[0.04] bg-white border dark:border-white/8 border-gray-100 rounded-2xl px-5 py-4">
            <Images className="w-4 h-4 dark:text-white/30 text-gray-400 shrink-0" />
            <p className="dark:text-white/40 text-gray-500 text-sm">
              Esta es una galería de demostración. En un evento real, aquí aparecen las fotos subidas por los invitados.
            </p>
            <Link to="/signup" className="ml-auto shrink-0">
              <button className="text-xs dark:bg-white dark:text-black bg-gray-900 text-white px-4 py-2 rounded-full hover:opacity-80 transition-opacity font-medium whitespace-nowrap">
                Crear cuenta gratis
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Masonry Photo Grid */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {photosLoading ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="break-inside-avoid dark:bg-white/5 bg-gray-200 animate-pulse rounded-2xl"
                  style={{ height: `${[200, 260, 180, 300, 220, 240][i % 6]}px` }}
                />
              ))}
            </div>
          ) : !photos || photos.length === 0 ? (
            <div className="text-center py-32">
              <div className="mx-auto w-16 h-16 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                <Camera className="w-7 h-7 dark:text-white/20 text-gray-300" />
              </div>
              <h3 className="text-lg font-light dark:text-white/50 text-gray-500 mb-2">Aún no hay fotos</h3>
              <p className="dark:text-white/25 text-gray-400 text-sm">
                Las fotos aparecerán aquí una vez que los invitados las suban.
              </p>
            </div>
          ) : filteredAndSortedPhotos.length === 0 ? (
            <div className="text-center py-32">
              <div className="mx-auto w-16 h-16 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                <Search className="w-7 h-7 dark:text-white/20 text-gray-300" />
              </div>
              <h3 className="text-lg font-light dark:text-white/50 text-gray-500 mb-2">Sin resultados</h3>
              <p className="dark:text-white/25 text-gray-400 text-sm mb-8">
                Intenta ajustar los filtros de búsqueda
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDateFilter('all')
                  setSortOrder('newest')
                }}
                className="dark:border dark:border-white/15 dark:text-white/50 dark:hover:text-white border border-gray-300 text-gray-500 hover:text-gray-900 px-6 py-2.5 rounded-full transition-all text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-2 md:gap-3">
              {filteredAndSortedPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="break-inside-avoid mb-2 md:mb-3 group relative overflow-hidden rounded-xl md:rounded-2xl cursor-pointer"
                  style={{
                    opacity: 0,
                    animation: `fadeSlideUp 0.4s ease forwards`,
                    animationDelay: `${Math.min(index * 40, 600)}ms`,
                  }}
                  onClick={() => openPhotoViewer(index)}
                >
                  <img
                    src={getThumbnailUrl(photo)}
                    alt="Foto del evento"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-300 rounded-xl md:rounded-2xl" />

                  {/* Download button */}
                  {event.allow_downloads && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadImage(getImageUrl(photo.image_path), photo.id)
                      }}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full p-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Uploader name */}
                  {photo.uploader_name && (
                    <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8 rounded-b-xl md:rounded-b-2xl">
                      <p className="text-white/90 text-xs font-medium">{photo.uploader_name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload CTA */}
      {!isDemo && (
        <section className="py-20 px-4 border-t dark:border-white/8 border-gray-100">
          <div className="max-w-sm mx-auto text-center">
            <div className="w-12 h-12 dark:bg-white/5 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Upload className="w-5 h-5 dark:text-white/30 text-gray-400" />
            </div>
            <h3 className="text-lg font-light dark:text-white/70 text-gray-700 mb-2">
              ¿Tomaste fotos del evento?
            </h3>
            <p className="dark:text-white/30 text-gray-400 text-sm mb-8">
              Compártelas con todos los invitados
            </p>
            <Link to={`/upload/${eventSlug}`}>
              <button className="dark:bg-white dark:text-black bg-gray-900 text-white font-medium px-8 py-3 rounded-full hover:opacity-90 transition-opacity text-sm">
                Subir mis fotos
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Photo Viewer */}
      {filteredAndSortedPhotos.length > 0 && (
        <PhotoViewer
          photos={filteredAndSortedPhotos}
          currentIndex={currentPhotoIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={event.allow_downloads ? downloadImage : undefined}
          allowDownloads={event.allow_downloads}
          getImageUrl={getImageUrl}
        />
      )}

    
    </div>
  )
}
