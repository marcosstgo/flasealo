import React from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, QrCode, Shield, Download, Search, Zap, Lock,
  Users, Smartphone, BarChart2, CheckCircle2, ImageOff,
  Globe, Filter, Layers, ArrowRight, Sparkles, RefreshCw,
  Clock, Archive, Star
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const categories = [
  {
    label: 'Para el fotógrafo',
    color: 'dark:bg-white/5 bg-white',
    features: [
      {
        icon: QrCode,
        title: 'QR único por evento',
        desc: 'Genera un código QR personalizado por evento. Imprímelo, ponlo en las mesas y los invitados suben fotos sin descargar ninguna app.'
      },
      {
        icon: Shield,
        title: 'Moderación de fotos',
        desc: 'Aprueba o rechaza cada foto antes de que aparezca en la galería del cliente. También puedes activar la aprobación automática.'
      },
      {
        icon: Download,
        title: 'Descarga masiva en ZIP',
        desc: 'Descarga todas las fotos aprobadas en un solo archivo ZIP con un clic. Listo para subir a Pixieset, Google Drive o entregar al cliente.'
      },
      {
        icon: BarChart2,
        title: 'Estadísticas del evento',
        desc: 'Visualiza cuántas fotos se subieron, quiénes subieron más, y el ritmo de subida a lo largo del tiempo.'
      },
      {
        icon: Search,
        title: 'Búsqueda y filtros avanzados',
        desc: 'Filtra fotos por nombre del invitado, estado (pendiente, aprobada, rechazada) o fecha. Encuentra cualquier foto en segundos.'
      },
      {
        icon: Layers,
        title: 'Gestión de múltiples eventos',
        desc: 'Administra todos tus eventos desde un panel central. Activa, pausa o archiva eventos con facilidad.'
      },
    ]
  },
  {
    label: 'Para los invitados',
    color: 'dark:bg-white/5 bg-white',
    features: [
      {
        icon: Smartphone,
        title: 'Sin apps ni registro',
        desc: 'Los invitados escanean el QR, escriben su nombre y suben sus fotos. No necesitan crear cuenta ni descargar nada.'
      },
      {
        icon: Users,
        title: 'Sube desde cualquier celular',
        desc: 'Compatible con todos los dispositivos: iPhone, Android, cualquier navegador. Las fotos llegan al instante.'
      },
      {
        icon: Globe,
        title: 'Galería compartible',
        desc: 'El cliente recibe un link elegante para ver todas las fotos desde cualquier dispositivo, cuando quiera.'
      },
    ]
  },
  {
    label: 'Privacidad y seguridad',
    color: 'dark:bg-white/5 bg-white',
    features: [
      {
        icon: Lock,
        title: 'Galería con contraseña',
        desc: 'Protege la galería del cliente con una contraseña opcional. Solo quien tenga el link y la clave puede ver las fotos.'
      },
      {
        icon: ImageOff,
        title: 'Detección de duplicados',
        desc: 'El sistema detecta automáticamente si un invitado intenta subir la misma foto dos veces, usando una huella digital del archivo.'
      },
      {
        icon: Filter,
        title: 'Control anti-spam',
        desc: 'Límites configurables de fotos por invitado y por ventana de tiempo, para evitar que alguien sature el evento.'
      },
      {
        icon: RefreshCw,
        title: 'Miniaturas automáticas',
        desc: 'Cada foto genera una miniatura optimizada automáticamente. Las galerías con cientos de imágenes cargan al instante.'
      },
    ]
  },
]

const changelog: { version: string; date: string; tag: string; tagColor: string; changes: string[] }[] = [
  {
    version: '1.0.0',
    date: 'Julio 2026',
    tag: 'Lanzamiento',
    tagColor: 'dark:bg-emerald-500/15 dark:text-emerald-300 bg-emerald-50 text-emerald-700',
    changes: [
      'Sistema de trial gratuito de 14 días para nuevas cuentas',
      'Detección de fotos duplicadas mediante SHA-256',
      'Control anti-spam con límites de subida por invitado',
      'Generación automática de miniaturas para carga rápida',
      'Galería protegida con contraseña opcional',
      'Descarga masiva de fotos aprobadas en ZIP',
      'Estadísticas por evento con gráficos en tiempo real',
      'Panel de administración global para gestión de usuarios',
      'Modo claro y oscuro en toda la plataforma',
      'Soporte para imágenes HEIC (iPhone)',
    ]
  },
]

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function FeaturesPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] dark:text-white text-gray-900">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 dark:bg-black/40 bg-[#faf9f7]/80 backdrop-blur-md border-b dark:border-white/10 border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
              <Camera className="w-4 h-4 dark:text-black text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Flashealo</span>
          </Link>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
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
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 dark:text-white/40 text-gray-400" />
            <span className="text-xs font-mono dark:text-white/40 text-gray-500 tracking-wider">v{__APP_VERSION__}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-6 tracking-tight">
            Todo lo que incluye<br />
            <span className="dark:text-white/40 text-gray-400">Flashealo</span>
          </h1>
          <p className="dark:text-white/40 text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            Una plataforma completa para fotógrafos profesionales. Sin integraciones complicadas, sin costos ocultos.
          </p>
        </div>
      </section>

      {/* Feature categories */}
      {categories.map((cat) => (
        <section key={cat.label} className="py-16 px-6 border-t dark:border-white/10 border-gray-200">
          <div className="max-w-5xl mx-auto">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-12">
              {cat.label}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px dark:bg-white/10 bg-gray-200 rounded-2xl overflow-hidden">
              {cat.features.map((f) => (
                <div key={f.title} className={`${cat.color} p-8 flex flex-col gap-4`}>
                  <div className="w-10 h-10 dark:bg-white/10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-5 h-5 dark:text-white/60 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1.5">{f.title}</h3>
                    <p className="dark:text-white/40 text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Changelog */}
      <section className="py-24 px-6 border-t dark:border-white/10 border-gray-200">
        <div className="max-w-3xl mx-auto">
          <div className="mb-16">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-4">Historial</p>
            <h2 className="text-3xl font-light">Novedades por versión</h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 bottom-0 w-px dark:bg-white/10 bg-gray-200" />

            <div className="space-y-14">
              {changelog.map((entry) => (
                <div key={entry.version} className="pl-8 relative">
                  {/* Dot */}
                  <div className="absolute left-0 top-1.5 w-2.5 h-2.5 -translate-x-[5px] rounded-full dark:bg-white/30 bg-gray-400 ring-4 dark:ring-[#0d0d0d] ring-[#faf9f7]" />

                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="text-xl font-mono font-light">v{entry.version}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${entry.tagColor}`}>
                      {entry.tag}
                    </span>
                    <span className="flex items-center gap-1.5 dark:text-white/25 text-gray-400 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {entry.date}
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {entry.changes.map((change) => (
                      <li key={change} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 dark:text-white/20 text-gray-300 flex-shrink-0 mt-0.5" />
                        <span className="dark:text-white/60 text-gray-600 text-sm leading-relaxed">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Coming soon placeholder */}
              <div className="pl-8 relative opacity-40">
                <div className="absolute left-0 top-1.5 w-2.5 h-2.5 -translate-x-[5px] rounded-full dark:bg-white/10 bg-gray-300 ring-4 dark:ring-[#0d0d0d] ring-[#faf9f7] border dark:border-white/20 border-gray-300" />
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-mono font-light">v1.1.0</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-white/5 bg-gray-100 dark:text-white/40 text-gray-500 border dark:border-white/10 border-gray-200">
                    Próximamente
                  </span>
                </div>
                <div className="flex items-center gap-2 dark:text-white/30 text-gray-400 text-sm">
                  <Star className="w-3.5 h-3.5" />
                  Nuevas funciones en desarrollo
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t dark:border-white/10 border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-light mb-4 leading-tight">
            Empieza hoy.<br />
            <span className="dark:text-white/40 text-gray-400">14 días gratis.</span>
          </h2>
          <p className="dark:text-white/40 text-gray-500 mb-10 text-lg">
            Acceso completo a todas las funciones. Sin tarjeta de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <button className="dark:bg-white dark:text-black bg-gray-900 text-white font-medium px-10 py-4 rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                Crear cuenta gratis
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/">
              <button className="dark:border dark:border-white/20 dark:text-white/60 dark:hover:text-white dark:hover:border-white/40 border border-gray-900/20 text-gray-600 hover:text-gray-900 hover:border-gray-900/40 px-10 py-4 rounded-full transition-all inline-flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Ver la plataforma
              </button>
            </Link>
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
            <Link to="/login" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Iniciar sesión</Link>
            <Link to="/signup" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
