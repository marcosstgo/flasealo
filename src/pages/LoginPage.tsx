import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Attempting to sign in user:', data.email)
      
      const { data: authData, error: authError } = await signIn(data.email, data.password)
      
      console.log('Sign in response:', { authData, authError })

      if (authError) {
        console.error('Auth error:', authError)
        
        // Provide more user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos. Por favor verifica tus datos.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('No se pudo iniciar sesión. Por favor intenta de nuevo.')
        return
      }

      console.log('User signed in successfully')
      setSuccess('¡Inicio de sesión exitoso! Redirigiendo...')
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (err: any) {
      console.error('Unexpected error during login:', err)
      setError(err.message || 'Ocurrió un error inesperado. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Flashealo.com
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              Bienvenido de Vuelta
            </h1>
            <p className="text-gray-600 text-center">
              Inicia sesión en tu cuenta para continuar
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
                error={errors.email?.message}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                {...register('password', {
                  required: 'La contraseña es requerida',
                })}
                error={errors.password?.message}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/signup"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Crear cuenta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
            <p><strong>Debug Info:</strong></p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ Configurado' : '✗ No configurado'}</p>
            <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Configurado' : '✗ No configurado'}</p>
          </div>
        )}
      </div>
    </div>
  )
}