import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true)
      } else {
        setError('El enlace de recuperación es inválido o ya expiró. Solicita uno nuevo.')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  const inputClass = "w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm disabled:opacity-40"

  return (
    <div className="min-h-screen dark:bg-[#0d0d0d] bg-[#faf9f7] flex flex-col">
      <header className="px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-7 h-7 dark:bg-white bg-gray-900 rounded-md flex items-center justify-center">
            <Camera className="w-4 h-4 dark:text-black text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight dark:text-white text-gray-900">Flashealo</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">Nueva contraseña</h1>
            <p className="dark:text-white/40 text-gray-500 text-sm">Ingresa tu nueva contraseña</p>
          </div>

          <div className="space-y-4">
            {success ? (
              <div className="dark:bg-green-500/10 bg-green-50 dark:border dark:border-green-500/20 border border-green-200 dark:text-green-300 text-green-700 px-4 py-4 rounded-xl text-sm text-center">
                ¡Contraseña actualizada! Redirigiendo al dashboard...
              </div>
            ) : (
              <>
                {error && (
                  <div className="dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/20 border border-red-200 dark:text-red-300 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Nueva contraseña (mín. 8 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!sessionReady}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={!sessionReady}
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !sessionReady}
                    className="w-full dark:bg-white dark:text-black bg-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
