import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

interface SignupForm {
  email: string
  password: string
  confirmPassword: string
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
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
              <div>
                <input type="email" placeholder="Email"
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email inválido' },
                  })}
                  className={inputClass}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>}
              </div>

              <div>
                <input type="password" placeholder="Contraseña (mín. 6 caracteres)"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                  className={inputClass}
                />
                {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message}</p>}
              </div>

              <div>
                <input type="password" placeholder="Confirmar contraseña"
                  {...register('confirmPassword', {
                    required: 'Por favor confirma tu contraseña',
                    validate: (value) => value === password || 'Las contraseñas no coinciden',
                  })}
                  className={inputClass}
                />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>}
              </div>

              <p className="dark:text-white/25 text-gray-400 text-xs leading-relaxed px-1 pt-1">
                Los nuevos usuarios necesitan aprobación del administrador para crear eventos.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full dark:bg-white dark:text-black bg-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
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
