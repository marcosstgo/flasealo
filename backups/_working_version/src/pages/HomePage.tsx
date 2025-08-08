import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, Zap, Shield, Users, QrCode, Heart } from 'lucide-react'
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
      image: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      title: 'Festivales',
      description: 'Como en el Festival de las Flores en Aibonito, captura la diversión desde múltiples perspectivas.',
      image: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400'
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
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Potencia tu Cobertura
            <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Fotográfica Profesional
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            <strong>Flashealo.com</strong> es el complemento perfecto para fotógrafos profesionales. 
            Permite que los invitados capturen y compartan su propia perspectiva, 
            creando una cobertura completa y auténtica de cada evento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar Gratis
              </Button>
            </Link>
            <Link to="/gallery/demo-event">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Ver Demostración
              </Button>
            </Link>
          </div>
          
          {/* Value Proposition */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Cómo funciona?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Genera el QR</h4>
                  <p className="text-gray-600 text-sm">Crea un código QR personalizado para tu evento en segundos</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Invitados Escanean</h4>
                  <p className="text-gray-600 text-sm">Los asistentes escanean, ingresan su nombre y suben fotos</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Tú Moderas</h4>
                  <p className="text-gray-600 text-sm">Revisa y aprueba las fotos antes de que aparezcan en la galería</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfecto para Todo Tipo de Eventos
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Características que Marcan la Diferencia
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ¿Listo para Revolucionar tus Eventos?
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