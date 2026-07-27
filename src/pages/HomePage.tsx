import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, QrCode, Shield, Download, Check, Search, Zap, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { supabase } from '../lib/supabase'

const DEMO_EVENT_SLUG = 'demo-event'

const FALLBACK_PHOTOS = [
  { id: '1', src: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Ana' },
  { id: '2', src: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Carlos' },
  { id: '3', src: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600', name: null },
  { id: '4', src: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'María' },
  { id: '5', src: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Pedro' },
  { id: '6', src: 'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=600', name: null },
  { id: '7', src: 'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Laura' },
  { id: '8', src: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Sofía' },
  { id: '9', src: 'https://images.pexels.com/photos/3014853/pexels-photo-3014853.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Diego' },
  { id: '10', src: 'https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Valeria' },
  { id: '11', src: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600', name: null },
  { id: '12', src: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=600', name: 'Rodrigo' },
]

async function fetchDemoPhotos() {
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', DEMO_EVENT_SLUG)
    .maybeSingle()

  if (!event) return []

  const { data: photos } = await supabase
    .from('photos')
    .select('id, image_path, uploader_name')
    .eq('event_id', event.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (!photos || photos.length === 0) return []

  return photos.map((p) => ({
    id: p.id,
    src: supabase.storage.from('event-photos').getPublicUrl(p.image_path).data.publicUrl,
    name: p.uploader_name ?? null,
  }))
}

export function HomePage() {
  const { user } = useAuth()

  const { data: demoPhotos } = useQuery({
    queryKey: ['demo-preview-photos'],
    queryFn: fetchDemoPhotos,
    staleTime: 5 * 60 * 1000,
  })

  const previewPhotos = demoPhotos && demoPhotos.length >= 4 ? demoPhotos : FALLBACK_PHOTOS

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] dark:text-white text-gray-900">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 dark:bg-black/40 bg-[#faf9f7]/80 backdrop-blur-md border-b dark:border-white/10 border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
              <Camera className="w-4 h-4 dark:text-black text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Flashealo</span>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link to="/features" className="dark:text-white/50 dark:hover:text-white text-gray-500 hover:text-gray-900 text-sm transition-colors hidden md:block">
              Funciones
            </Link>
            <Link to="/pricing" className="dark:text-white/50 dark:hover:text-white text-gray-500 hover:text-gray-900 text-sm transition-colors hidden md:block">
              Precios
            </Link>
            {user ? (
              <Link to="/dashboard">
                <button className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                  Panel de Control
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <button className="dark:text-white/60 dark:hover:text-white text-gray-500 hover:text-gray-900 text-sm transition-colors px-3 py-2">
                    Iniciar Sesión
                  </button>
                </Link>
                <Link to="/signup">
                  <button className="dark:bg-white dark:text-black bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                    Comenzar
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Wedding"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b dark:from-[#0d0d0d]/60 from-[#faf9f7]/60 via-transparent dark:to-[#0d0d0d] to-[#faf9f7]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="dark:text-white/40 text-gray-400 text-sm tracking-widest uppercase mb-6">
            Para fotógrafos profesionales
          </p>
          <h1 className="text-5xl md:text-7xl font-light leading-tight mb-6 tracking-tight">
            Tus fotos.<br />
            Las de tus invitados.<br />
            <span className="dark:text-white/50 text-gray-400">Un solo álbum.</span>
          </h1>
          <p className="dark:text-white/50 text-gray-500 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Pon un QR en cada mesa. Los invitados suben sus fotos desde el celular.
            Tú moderas, descargas y entregas un álbum completo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <button className="dark:bg-white dark:text-black bg-gray-900 text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-sm">
                Crear cuenta gratis
              </button>
            </Link>
            <Link to="/gallery/demo-event">
              <button className="dark:border dark:border-white/20 dark:text-white/70 dark:hover:text-white dark:hover:border-white/40 border border-gray-900/20 text-gray-600 hover:text-gray-900 hover:border-gray-900/40 px-8 py-3.5 rounded-full transition-all text-sm">
                Ver galería demo
              </button>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent dark:to-white/30 to-gray-400/40" />
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-4">Flujo de trabajo</p>
            <h2 className="text-3xl md:text-4xl font-light">Así funciona</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                number: '01',
                title: 'Crea el evento',
                desc: 'Configura el evento, genera el QR y ponlo en las mesas. Todo listo en menos de 2 minutos.'
              },
              {
                number: '02',
                title: 'Invitados suben fotos',
                desc: 'Escanean el QR con el celular, ingresan su nombre y suben sus fotos. Sin apps, sin registro.'
              },
              {
                number: '03',
                title: 'Tú moderas y descargas',
                desc: 'Apruebas las fotos que quieres incluir y descargas todo en un ZIP listo para entregar.'
              }
            ].map((step) => (
              <div key={step.number} className="dark:bg-white/5 bg-[#faf9f7] p-10">
                <p className="dark:text-white/20 text-gray-300 text-4xl font-light mb-6">{step.number}</p>
                <h3 className="text-lg font-medium mb-3">{step.title}</h3>
                <p className="dark:text-white/40 text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Gallery Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t dark:border-white/8 border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
            <div>
              <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Vista previa
              </p>
              <h2 className="text-3xl md:text-4xl font-light">Así se ve la galería<br />
                <span className="dark:text-white/40 text-gray-400">de tus invitados</span>
              </h2>
            </div>
            <Link to="/gallery/demo-event">
              <button className="group flex items-center gap-2 dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white dark:hover:border-white/40 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 px-5 py-2.5 rounded-full transition-all text-sm whitespace-nowrap">
                Ver galería completa
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
          </div>

          {/* Masonry preview grid */}
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 md:gap-3">
            {previewPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid mb-2 md:mb-3 group relative overflow-hidden rounded-xl md:rounded-2xl cursor-pointer"
                style={{
                  opacity: 0,
                  animation: 'fadeSlideUp 0.45s ease forwards',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Link to="/gallery/demo-event">
                  <img
                    src={photo.src}
                    alt="Vista previa galería"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 rounded-xl md:rounded-2xl" />
                  {photo.name && (
                    <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8 rounded-b-xl md:rounded-b-2xl">
                      <p className="text-white/90 text-xs font-medium">{photo.name}</p>
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-3 gap-px dark:bg-white/8 bg-gray-200 rounded-2xl overflow-hidden">
            {[
              { value: '2 min', label: 'para crear un evento' },
              { value: '0 apps', label: 'los invitados no instalan nada' },
              { value: '100%', label: 'de las fotos en un ZIP' },
            ].map((stat) => (
              <div key={stat.value} className="dark:bg-[#0a0a0a] bg-[#f8f7f5] px-6 py-8 text-center">
                <p className="text-2xl md:text-3xl font-light dark:text-white text-gray-900 mb-1">{stat.value}</p>
                <p className="dark:text-white/30 text-gray-400 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events showcase */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: 'Bodas',
                desc: 'Captura los momentos que tú no puedes estar en dos lugares a la vez.',
                img: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800'
              },
              {
                title: 'Quinceañeras',
                desc: 'Familiares y amigos comparten su perspectiva única del momento.',
                img: '/quinceanera.jpg'
              },
              {
                title: 'Festivales y corporativos',
                desc: 'Cientos de personas, cientos de ángulos. Una sola galería.',
                img: '/Festival.jpg'
              }
            ].map((item) => (
              <div key={item.title} className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white text-xl font-medium mb-1">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 border-t dark:border-white/10 border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-4">Herramientas</p>
            <h2 className="text-3xl md:text-4xl font-light mb-4">Todo lo que necesitas</h2>
            <p className="dark:text-white/40 text-gray-500 text-sm max-w-md mx-auto">Las herramientas esenciales para fotógrafos que quieren entregar más sin complicarse más.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                icon: QrCode,
                title: 'QR por evento',
                desc: 'Código único por evento. Imprime, pon en las mesas y listo. Los invitados no necesitan instalar nada.'
              },
              {
                icon: Shield,
                title: 'Moderación inteligente',
                desc: 'Aprueba o rechaza cada foto, o activa auto-aprobación para eventos sin moderación. Con protección anti-spam incluida.'
              },
              {
                icon: Search,
                title: 'Búsqueda avanzada',
                desc: 'Encuentra fotos rápidamente por nombre del invitado, fecha o estado. Filtra y organiza con facilidad.'
              },
              {
                icon: Download,
                title: 'Descarga en bulk',
                desc: 'Todas las fotos aprobadas en un ZIP con un click. Listo para subir a Pixieset o entregar al cliente.'
              },
              {
                icon: Lock,
                title: 'Galería protegida',
                desc: 'El cliente recibe un link elegante para ver las fotos. Con contraseña opcional para mayor privacidad.'
              },
              {
                icon: Zap,
                title: 'Carga ultrarrápida',
                desc: 'Sistema optimizado con miniaturas automáticas. Galerías con cientos de fotos se cargan al instante.'
              }
            ].map((feature) => (
              <div key={feature.title} className="dark:bg-white/5 bg-[#faf9f7] p-10 flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 dark:bg-white/10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-5 h-5 dark:text-white/60 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium mb-2">{feature.title}</h3>
                  <p className="dark:text-white/40 text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/features">
              <button className="inline-flex items-center gap-2 dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white dark:hover:border-white/40 border border-gray-900/20 text-gray-500 hover:text-gray-900 hover:border-gray-900/40 px-7 py-3 rounded-full transition-all text-sm">
                Ver todas las funciones
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
            Empieza hoy.<br />
            <span className="dark:text-white/40 text-gray-400">Es gratis.</span>
          </h2>
          <p className="dark:text-white/40 text-gray-500 mb-10">
            Crea tu cuenta, configura tu primer evento en minutos y entrega algo que tus clientes nunca olvidarán.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link to="/signup">
              <button className="dark:bg-white dark:text-black bg-gray-900 text-white font-medium px-10 py-4 rounded-full hover:opacity-90 transition-opacity">
                Crear cuenta gratis
              </button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 dark:text-white/30 text-gray-400 text-sm">
            {['Sin tarjeta de crédito', 'Configuración en minutos', 'Soporte incluido'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t dark:border-white/10 border-gray-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 dark:bg-white bg-gray-900 rounded flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 dark:text-black text-white" />
            </div>
            <span className="dark:text-white/60 text-gray-500 text-sm">Flashealo.com</span>
          </div>
          <p className="dark:text-white/20 text-gray-400 text-sm">© 2025 Flashealo. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="dark:text-white/15 text-gray-300 text-xs font-mono">v{__APP_VERSION__}</span>
            <Link to="/features" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Funciones</Link>
            <Link to="/login" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Iniciar sesión</Link>
            <Link to="/signup" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Registrarse</Link>
            <Link to="/gallery/demo-event" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Demo</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
