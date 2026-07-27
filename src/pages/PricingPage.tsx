import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, Check, X, Zap, Shield, Download, QrCode,
  Lock, BarChart2, Users, ArrowRight, HelpCircle, Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

// ─── Data ────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Para empezar sin complicaciones',
    monthlyPrice: 12,
    annualPrice: 10,
    cta: 'Comenzar gratis',
    ctaLink: '/signup',
    highlighted: false,
    badge: null,
    color: 'dark:bg-white/[0.04] bg-white',
    features: [
      { text: '3 eventos activos', included: true },
      { text: '300 fotos por evento', included: true },
      { text: 'QR único por evento', included: true },
      { text: 'Galería compartible', included: true },
      { text: 'Descarga ZIP', included: true },
      { text: 'Moderación manual', included: true },
      { text: 'Galería con contraseña', included: false },
      { text: 'Estadísticas detalladas', included: false },
      { text: 'Anti-spam avanzado', included: false },
      { text: 'Miniaturas automáticas', included: false },
      { text: 'Branding personalizado', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para fotógrafos profesionales',
    monthlyPrice: 25,
    annualPrice: 20,
    cta: 'Empezar con Pro',
    ctaLink: '/signup',
    highlighted: true,
    badge: 'Más popular',
    color: 'dark:bg-white/[0.07] bg-white',
    features: [
      { text: 'Eventos ilimitados', included: true },
      { text: 'Fotos ilimitadas', included: true },
      { text: 'QR único por evento', included: true },
      { text: 'Galería compartible', included: true },
      { text: 'Descarga ZIP', included: true },
      { text: 'Moderación manual y automática', included: true },
      { text: 'Galería con contraseña', included: true },
      { text: 'Estadísticas detalladas', included: true },
      { text: 'Anti-spam avanzado', included: true },
      { text: 'Miniaturas automáticas', included: true },
      { text: 'Branding personalizado', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Para estudios y agencias',
    monthlyPrice: 59,
    annualPrice: 47,
    cta: 'Contactar ventas',
    ctaLink: '/signup',
    highlighted: false,
    badge: null,
    color: 'dark:bg-white/[0.04] bg-white',
    features: [
      { text: 'Eventos ilimitados', included: true },
      { text: 'Fotos ilimitadas', included: true },
      { text: 'QR único por evento', included: true },
      { text: 'Galería compartible', included: true },
      { text: 'Descarga ZIP', included: true },
      { text: 'Moderación manual y automática', included: true },
      { text: 'Galería con contraseña', included: true },
      { text: 'Estadísticas detalladas', included: true },
      { text: 'Anti-spam avanzado', included: true },
      { text: 'Miniaturas automáticas', included: true },
      { text: 'Branding personalizado', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
]

const faqs = [
  {
    q: '¿Hay una prueba gratuita?',
    a: 'Sí. Todas las cuentas nuevas incluyen 14 días de acceso completo a todas las funciones, sin tarjeta de crédito. Al terminar el trial puedes elegir el plan que mejor se adapte a ti.'
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí, puedes subir o bajar de plan cuando quieras. Los cambios se aplican de inmediato y se prorratean según los días del mes que te queden.'
  },
  {
    q: '¿Qué pasa con mis fotos si cancelo?',
    a: 'Tus fotos permanecen disponibles durante 30 días después de cancelar, dándote tiempo suficiente para descargarlas. Después de ese período se eliminan permanentemente.'
  },
  {
    q: '¿Los invitados necesitan pagar o crear una cuenta?',
    a: 'No. Los invitados simplemente escanean el QR y suben sus fotos desde el navegador sin instalar nada ni pagar nada. Solo el organizador necesita una cuenta.'
  },
  {
    q: '¿Qué incluye el branding personalizado del plan Studio?',
    a: 'Puedes agregar tu logo en la galería del cliente, personalizar los colores y ocultar referencias a Flashealo. Ideal para estudios que quieren presentar una experiencia completamente propia.'
  },
  {
    q: '¿Qué formas de pago aceptan?',
    a: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, Amex). El pago se procesa de forma segura a través de Stripe.'
  },
]

const highlights = [
  { icon: QrCode, label: 'QR en menos de 1 min' },
  { icon: Zap, label: 'Galería en tiempo real' },
  { icon: Download, label: 'ZIP listo para entregar' },
  { icon: Shield, label: 'Moderación completa' },
  { icon: Lock, label: 'Galería protegida' },
  { icon: BarChart2, label: 'Estadísticas por evento' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function PricingPage() {
  const { user } = useAuth()
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
            <Link to="/features" className="dark:text-white/50 dark:hover:text-white text-gray-500 hover:text-gray-900 text-sm transition-colors hidden md:block">
              Funciones
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
                    Comenzar gratis
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 dark:text-white/40 text-gray-400" />
            <span className="text-xs dark:text-white/40 text-gray-500 tracking-wider">14 días gratis en todos los planes</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-5 tracking-tight">
            Precios simples.<br />
            <span className="dark:text-white/40 text-gray-400">Sin sorpresas.</span>
          </h1>
          <p className="dark:text-white/40 text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            Empieza gratis. Sube de plan solo cuando lo necesites.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className={`text-sm transition-colors ${!annual ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-white/30 text-gray-400'}`}>
              Mensual
            </span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? 'dark:bg-white bg-gray-900' : 'dark:bg-white/20 bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${annual ? 'translate-x-6 dark:bg-gray-900 bg-white' : 'translate-x-0.5 dark:bg-white bg-white'}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm transition-colors ${annual ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-white/30 text-gray-400'}`}>
                Anual
              </span>
              <span className="text-xs dark:bg-emerald-500/15 dark:text-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                -20%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-7 flex flex-col ${plan.color} ${
                    plan.highlighted
                      ? 'dark:border-2 dark:border-white/30 border-2 border-gray-900/20 dark:shadow-none shadow-lg'
                      : 'dark:border dark:border-white/10 border border-gray-200'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="dark:bg-white dark:text-black bg-gray-900 text-white text-xs font-semibold px-3.5 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-1">{plan.name}</h2>
                    <p className="dark:text-white/40 text-gray-400 text-sm">{plan.tagline}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-light">${price}</span>
                      <span className="dark:text-white/40 text-gray-400 text-sm mb-1.5">/mes</span>
                    </div>
                    {annual && (
                      <p className="dark:text-white/30 text-gray-400 text-xs mt-1">
                        Facturado ${price * 12}/año
                      </p>
                    )}
                  </div>

                  <Link to={plan.ctaLink} className="mb-8">
                    <button className={`w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 ${
                      plan.highlighted
                        ? 'dark:bg-white dark:text-black bg-gray-900 text-white'
                        : 'dark:bg-white/10 dark:text-white dark:hover:bg-white/15 bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}>
                      {plan.cta}
                    </button>
                  </Link>

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 dark:text-white/15 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? 'dark:text-white/80 text-gray-700' : 'dark:text-white/25 text-gray-350 line-through'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Trial note */}
          <p className="text-center dark:text-white/25 text-gray-400 text-sm mt-6">
            Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* Feature highlights strip */}
      <section className="py-16 px-6 border-t dark:border-white/8 border-gray-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-center dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-10">
            Incluido en todos los planes
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px dark:bg-white/8 bg-gray-200 rounded-2xl overflow-hidden">
            {highlights.map((h) => (
              <div key={h.label} className="dark:bg-[#0d0d0d] bg-[#faf9f7] px-8 py-7 flex items-center gap-4">
                <div className="w-9 h-9 dark:bg-white/8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <h.icon className="w-4 h-4 dark:text-white/50 text-gray-500" />
                </div>
                <span className="dark:text-white/60 text-gray-600 text-sm">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare table — desktop */}
      <section className="py-24 px-6 border-t dark:border-white/8 border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-4">Comparativa</p>
            <h2 className="text-3xl font-light">¿Cuál plan es para ti?</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left pb-5 dark:text-white/30 text-gray-400 text-xs font-medium uppercase tracking-wider w-1/2">Función</th>
                  {plans.map(p => (
                    <th key={p.id} className={`pb-5 text-center text-sm font-semibold ${p.highlighted ? 'dark:text-white text-gray-900' : 'dark:text-white/50 text-gray-500'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-gray-100">
                {[
                  { label: 'Eventos activos', values: ['3', 'Ilimitados', 'Ilimitados'] },
                  { label: 'Fotos por evento', values: ['300', 'Ilimitadas', 'Ilimitadas'] },
                  { label: 'Invitados simultáneos', values: ['Sin límite', 'Sin límite', 'Sin límite'] },
                  { label: 'QR por evento', values: [true, true, true] },
                  { label: 'Descarga ZIP', values: [true, true, true] },
                  { label: 'Moderación de fotos', values: [true, true, true] },
                  { label: 'Auto-aprobación', values: [false, true, true] },
                  { label: 'Galería con contraseña', values: [false, true, true] },
                  { label: 'Estadísticas', values: [false, true, true] },
                  { label: 'Anti-spam avanzado', values: [false, true, true] },
                  { label: 'Miniaturas automáticas', values: [false, true, true] },
                  { label: 'Branding personalizado', values: [false, false, true] },
                  { label: 'Soporte prioritario', values: [false, false, true] },
                ].map((row) => (
                  <tr key={row.label} className="group">
                    <td className="py-3.5 dark:text-white/60 text-gray-600 text-sm">{row.label}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="py-3.5 text-center">
                        {typeof val === 'boolean' ? (
                          val
                            ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            : <X className="w-4 h-4 dark:text-white/15 text-gray-300 mx-auto" />
                        ) : (
                          <span className={`text-sm ${i === 1 ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-white/50 text-gray-500'}`}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t dark:border-white/8 border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="dark:text-white/30 text-gray-400 text-xs tracking-widest uppercase mb-4">FAQ</p>
            <h2 className="text-3xl font-light">Preguntas frecuentes</h2>
          </div>

          <div className="divide-y dark:divide-white/8 divide-gray-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-5">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start justify-between gap-4 text-left group"
                >
                  <span className={`text-sm font-medium transition-colors ${openFaq === i ? 'dark:text-white text-gray-900' : 'dark:text-white/70 dark:group-hover:text-white text-gray-700 group-hover:text-gray-900'}`}>
                    {faq.q}
                  </span>
                  <HelpCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-all ${openFaq === i ? 'dark:text-white text-gray-900 rotate-180' : 'dark:text-white/30 text-gray-400'}`} />
                </button>
                {openFaq === i && (
                  <p className="mt-3 dark:text-white/50 text-gray-500 text-sm leading-relaxed pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t dark:border-white/8 border-gray-100">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-4xl font-light mb-5 leading-tight">
            14 días gratis.<br />
            <span className="dark:text-white/40 text-gray-400">Sin tarjeta de crédito.</span>
          </h2>
          <p className="dark:text-white/40 text-gray-500 mb-10">
            Acceso completo a todas las funciones del plan Pro durante el período de prueba.
          </p>
          <Link to="/signup">
            <button className="dark:bg-white dark:text-black bg-gray-900 text-white font-medium px-10 py-4 rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2">
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center justify-center gap-6 dark:text-white/25 text-gray-400 text-sm mt-8">
            {['Sin tarjeta', 'Cancela cuando quieras', 'Soporte incluido'].map(item => (
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
            <Link to="/features" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Funciones</Link>
            <Link to="/pricing" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Precios</Link>
            <Link to="/login" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Iniciar sesión</Link>
            <Link to="/signup" className="dark:text-white/30 dark:hover:text-white/60 text-gray-400 hover:text-gray-600 text-sm transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
