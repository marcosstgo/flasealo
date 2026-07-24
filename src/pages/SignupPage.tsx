import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'

const PROFESSIONS = [
  'Fotógrafo/a profesional',
  'Organizador/a de eventos',
  'Wedding planner / Coordinador/a de bodas',
  'DJ / Animador/a',
  'Coordinador/a de quinceañeras',
  'Gerente de salón / Venue',
  'Camarógrafo/a / Videógrafo/a',
  'Agencia de marketing',
  'Creador/a de contenido',
  'Coordinador/a de festivales',
  'Comunicación y relaciones públicas',
  'Empresa / Sector corporativo',
  'Educación / Escuela',
  'Otro',
]

const REFERRAL_SOURCES = [
  'Instagram / Facebook',
  'TikTok',
  'YouTube',
  'Google / Búsqueda web',
  'Recomendación de un amigo',
  'WhatsApp',
  'Otro',
]

interface SignupForm {
  full_name: string
  email: string
  password: string
  confirmPassword: string
  profession: string
  referral_source: string
}

export function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>()
  const password = watch('password')

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: authData, error: authError } = await signUp(data.email, data.password)

      if (authError) {
        if (authError.message.includes('User already registered') || authError.message.includes('already been registered')) {
          setError('Este email ya está registrado. ¿Ya tienes una cuenta?')
        } else if (authError.message.includes('Password should be at least')) {
          setError('La contraseña debe tener al menos 6 caracteres.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('No se pudo crear el usuario. Por favor intenta de nuevo.')
        return
      }

      // Save profile data
      await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: data.full_name.trim(),
        profession: data.profession || null,
        referral_source: data.referral_source || null,
      })

      if (!authData.session) {
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = "w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm"

  const selectClass = "w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm appearance-none cursor-pointer"

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex flex-col">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
            <Camera className="w-4 h-4 dark:text-black text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight dark:text-white text-gray-900">Flashealo</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">Crear cuenta</h1>
            <p className="dark:text-white/40 text-gray-500 text-sm">Empieza a compartir fotos en tus eventos</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/20 border border-red-200 dark:text-red-300 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="dark:bg-green-500/10 bg-green-50 dark:border dark:border-green-500/20 border border-green-200 dark:text-green-300 text-green-600 px-4 py-3 rounded-xl text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

              {/* Section: Personal */}
              <div className="space-y-3">
                <p className="text-xs dark:text-white/30 text-gray-400 uppercase tracking-widest px-1">Tu información</p>

                <div>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    autoComplete="name"
                    {...register('full_name', { required: 'El nombre es requerido' })}
                    className={inputClass}
                  />
                  {errors.full_name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.full_name.message}</p>}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    {...register('email', {
                      required: 'El email es requerido',
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email inválido' },
                    })}
                    className={inputClass}
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Contraseña (mín. 6 caracteres)"
                    autoComplete="new-password"
                    {...register('password', {
                      required: 'La contraseña es requerida',
                      minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                    })}
                    className={inputClass}
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message}</p>}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    autoComplete="new-password"
                    {...register('confirmPassword', {
                      required: 'Por favor confirma tu contraseña',
                      validate: (value) => value === password || 'Las contraseñas no coinciden',
                    })}
                    className={inputClass}
                  />
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              {/* Section: About you */}
              <div className="space-y-3 pt-2">
                <p className="text-xs dark:text-white/30 text-gray-400 uppercase tracking-widest px-1">Cuéntanos sobre ti</p>

                <div className="relative">
                  <select
                    {...register('profession')}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled className="dark:bg-[#1a1a1a] bg-white dark:text-white/40 text-gray-400">
                      ¿A qué te dedicas?
                    </option>
                    {PROFESSIONS.map(p => (
                      <option key={p} value={p} className="dark:bg-[#1a1a1a] bg-white dark:text-white text-gray-900">
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-white/30 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    {...register('referral_source')}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled className="dark:bg-[#1a1a1a] bg-white dark:text-white/40 text-gray-400">
                      ¿Cómo nos conociste?
                    </option>
                    {REFERRAL_SOURCES.map(s => (
                      <option key={s} value={s} className="dark:bg-[#1a1a1a] bg-white dark:text-white text-gray-900">
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-white/30 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <p className="dark:text-white/25 text-gray-400 text-xs leading-relaxed px-1 pt-1">
                Los nuevos usuarios necesitan aprobación del administrador para crear eventos.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full dark:bg-white dark:text-black bg-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>

            <p className="text-center dark:text-white/30 text-gray-400 text-sm pt-2">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="dark:text-white dark:hover:text-white/80 text-gray-900 hover:text-gray-700 font-medium transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
