import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await signIn(data.email, data.password)

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('No se pudo iniciar sesión. Por favor intenta de nuevo.')
        return
      }

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

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
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">Bienvenido de vuelta</h1>
            <p className="dark:text-white/40 text-gray-500 text-sm">Inicia sesión en tu cuenta</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/20 border border-red-200 dark:text-red-300 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email inválido' },
                  })}
                  className="w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  {...register('password', { required: 'La contraseña es requerida' })}
                  className="w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full dark:bg-white dark:text-black bg-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>

            <div className="text-center space-y-3 pt-2">
              <Link to="/forgot-password" className="block dark:text-white/40 dark:hover:text-white/70 text-gray-400 hover:text-gray-700 text-sm transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
              <p className="dark:text-white/30 text-gray-400 text-sm">
                ¿No tienes una cuenta?{' '}
                <Link to="/signup" className="dark:text-white dark:hover:text-white/80 text-gray-900 hover:text-gray-700 font-medium transition-colors">
                  Registrarse
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
