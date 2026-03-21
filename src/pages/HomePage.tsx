import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, QrCode, Shield, Download, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

export function HomePage() {
  const { user } = useAuth()

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

      {/* Events showcase */}
      <section className="py-20 px-6">
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
                img: '/quinceanera copy.jpg'
              },
              {
                title: 'Festivales y corporativos',
                desc: 'Cientos de personas, cientos de ángulos. Una sola galería.',
                img: '/Festival copy.jpg'
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
            <h2 className="text-3xl md:text-4xl font-light">Todo lo que necesitas</h2>
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
                title: 'Moderación completa',
                desc: 'Aprueba o rechaza cada foto antes de que aparezca en la galería. Aprueba todas de un golpe o una a una.'
              },
              {
                icon: Download,
                title: 'Descarga en bulk',
                desc: 'Todas las fotos aprobadas en un ZIP con un click. Listo para subir a Pixieset o entregar al cliente.'
              },
              {
                icon: Camera,
                title: 'Galería para el cliente',
                desc: 'El cliente recibe un link elegante para ver las fotos. Con contraseña si lo prefieres.'
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
          <div className="flex gap-6">
            <Link to="/login" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Iniciar sesión</Link>
            <Link to="/signup" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Registrarse</Link>
            <Link to="/gallery/demo-event" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Demo</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
