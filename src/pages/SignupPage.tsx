import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>()

  const password = watch('password')

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Attempting to sign up user:', data.email)
      
      const { data: authData, error: authError } = await signUp(data.email, data.password)
      
      console.log('Sign up response:', { authData, authError })

      if (authError) {
        console.error('Auth error:', authError)
        
        // Provide more user-friendly error messages for common cases
        if (authError.message.includes('User already registered') || 
            authError.message.includes('already been registered')) {
          setError('Este email ya está registrado. ¿Ya tienes una cuenta? Intenta iniciar sesión.')
        } else if (authError.message.includes('Password should be at least')) {
          setError('La contraseña debe tener al menos 6 caracteres.')
        } else if (authError.message.includes('Invalid email')) {
          setError('El formato del email no es válido.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('No se pudo crear el usuario. Por favor intenta de nuevo.')
        return
      }

      // Check if email confirmation is required
      if (!authData.session) {
        setSuccess('¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.')
        setTimeout(() => {
          navigate('/login')
        }, 3000)
        return
      }

      // If we have a session, the user is logged in immediately
      console.log('User signed up and logged in successfully')
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo...')
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)

    } catch (err: any) {
      console.error('Unexpected error during signup:', err)
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
              Crear Cuenta
            </h1>
            <p className="text-gray-600 text-center">
              Comienza a compartir fotos en tus eventos
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
                placeholder="Mínimo 6 caracteres"
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: {
                    value: 6,
                    message: 'La contraseña debe tener al menos 6 caracteres',
                  },
                })}
                error={errors.password?.message}
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                placeholder="Repite tu contraseña"
                {...register('confirmPassword', {
                  required: 'Por favor confirma tu contraseña',
                  validate: (value) =>
                    value === password || 'Las contraseñas no coinciden',
                })}
                error={errors.confirmPassword?.message}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> Los nuevos usuarios necesitan autorización del administrador 
                  para crear eventos. Podrás gestionar eventos existentes normalmente una vez registrado.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700">
                  Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  to="/login"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Iniciar sesión
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