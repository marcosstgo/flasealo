import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, Zap, Shield, Users, QrCode, Heart, UserPlus, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  const features = [
    {
      icon: QrCode,
      title: 'Códigos QR Personalizados',
      description: 'Genera códigos QR únicos para cada evento. Los invitados escanean y suben fotos al instante.',
    },
    {
      icon: Camera,
      title: 'Colaboración Visual',
      description: 'Convierte a tus invitados en colaboradores visuales, capturando momentos desde ángulos únicos.',
    },
    {
      icon: Shield,
      title: 'Consentimiento Claro',
      description: 'Sistema transparente de consentimiento que garantiza confianza y autorización explícita.',
    },
    {
      icon: Heart,
      title: 'Momentos Espontáneos',
      description: 'Captura la esencia real del evento con fotos naturales y auténticas de los asistentes.',
    },
  ]

  const useCases = [
    {
      title: 'Bodas',
      description: 'Captura cada sonrisa, lágrima y momento de alegría desde la perspectiva de tus invitados.',
      image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      title: 'Quinceañeras',
      description: 'Documenta esta celebración especial con fotos únicas de familiares y amigos.',
      image: '/quinceanera copy.jpg'
    },
    {
      title: 'Festivales',
      description: 'Como en el Festival de las Flores en Aibonito, captura la diversión desde múltiples perspectivas.',
      image: '/Festival copy.jpg'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-white/20 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Flashealo.com
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link to="/dashboard">
                  <Button>Panel de Control</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/signup">
                    <Button>Comenzar</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 relative">
            <span className="inline-block transform hover:scale-105 transition-transform duration-300">
              Potencia tu Cobertura
            </span>
            <span className="block relative">
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent animate-pulse">
                Fotográfica en los Eventos
              </span>
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce delay-100"></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-bounce delay-300"></div>
              <div className="absolute top-1/2 -right-8 w-2 h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-ping delay-500"></div>
            </span>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl -z-10 animate-pulse"></div>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            <strong>Flashealo.com</strong> es el complemento perfecto para fotógrafos profesionales. 
            Permite que los invitados capturen y compartan su propia perspectiva, 
            creando una cobertura completa y auténtica de cada evento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                Comenzar Gratis
              </Button>
            </Link>
            <Link to="/gallery/demo-event">
              <Button variant="outline" size="lg" className="w-full sm:w-auto transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                Ver Demostración
              </Button>
            </Link>
          </div>
          
          {/* Value Proposition */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-4xl mx-auto shadow-xl border border-white/20">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              ¿Cómo funciona?
            </h3>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">Regístrate y Solicita Acceso</h4>
                  <p className="text-gray-600 text-base leading-relaxed">Crea tu cuenta y solicita autorización para crear eventos. Una vez aprobado, configura los detalles y genera tu código QR único</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <Camera className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">Invitados Participan</h4>
                  <p className="text-gray-600 text-base leading-relaxed">Los asistentes escanean tu QR, ingresan su nombre, dan consentimiento y suben sus mejores fotos del evento</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">Tú Moderas y Publicas</h4>
                  <p className="text-gray-600 text-base leading-relaxed">Revisa y aprueba las fotos antes de que aparezcan en tu galería pública. Control total sobre el contenido</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Perfecto para Todo Tipo de Eventos
              </span>
              {/* Decorative underline */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-emerald-400 to-purple-400 rounded-full"></div>
              {/* Floating particles */}
              <div className="absolute -top-1 left-0 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="absolute -top-2 right-4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
              <div className="absolute -bottom-1 right-0 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-700"></div>
            </h2>
            <p className="text-lg text-gray-600">
              Desde bodas íntimas hasta festivales masivos, captura cada perspectiva
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={useCase.image}
                    alt={useCase.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-600">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 relative inline-block">
              <span className="relative z-10">
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 bg-clip-text text-transparent">
                  Características que Marcan
                </span>
                <span className="block bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  la Diferencia
                </span>
              </span>
              {/* Animated background shapes */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/4 w-8 h-8 bg-orange-200 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-6 h-6 bg-pink-200 rounded-full opacity-60 animate-bounce delay-300"></div>
                <div className="absolute top-1/2 left-0 w-4 h-4 bg-purple-200 rounded-full opacity-60 animate-ping delay-500"></div>
                <div className="absolute top-1/2 right-0 w-5 h-5 bg-indigo-200 rounded-full opacity-60 animate-pulse delay-700"></div>
              </div>
              {/* Gradient line accent */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-orange-400 via-pink-400 to-indigo-400"></div>
            </h2>
            <p className="text-lg text-gray-600">
              Diseñado específicamente para fotógrafos profesionales y organizadores de eventos
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-300 text-center">
                <CardContent className="p-6">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-blue-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                "Una herramienta revolucionaria para fotógrafos"
              </h3>
              <p className="text-lg text-gray-600 italic mb-4">
                "Flashealo.com me permite ofrecer a mis clientes una experiencia completa. 
                Mientras yo me enfoco en las tomas profesionales, los invitados capturan 
                los momentos espontáneos que yo podría perder. Es el complemento perfecto."
              </p>
              <p className="text-gray-500 font-medium">
                - Fotógrafo Profesional de Eventos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 relative inline-block">
            <span className="relative z-10">
              <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-700 bg-clip-text text-transparent">
                ¿Listo para Revolucionar
              </span>
              <span className="block bg-gradient-to-r from-purple-700 via-pink-600 to-red-500 bg-clip-text text-transparent">
                tus Eventos?
              </span>
            </span>
            {/* Sparkle effects */}
            <div className="absolute -top-3 left-8 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -top-1 right-12 w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
            <div className="absolute -bottom-3 left-16 w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse delay-400"></div>
            <div className="absolute -bottom-1 right-8 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-600"></div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-600/10 to-pink-500/10 blur-2xl -z-10 animate-pulse"></div>
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Únete a fotógrafos profesionales que ya están usando Flashealo.com 
            para crear experiencias fotográficas más completas y auténticas
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-8 py-4">
              Comenzar Gratis Hoy
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Sin compromisos • Configuración en minutos • Soporte incluido
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-2">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Flashealo.com</span>
          </div>
          <p className="text-center text-gray-400 mb-4">
            Potenciando la fotografía profesional con la participación auténtica de los invitados
          </p>
          <p className="text-center text-gray-500 text-sm">
            © 2025 Flashealo.com. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}