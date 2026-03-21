import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setIsLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

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
            <h1 className="text-2xl font-light dark:text-white text-gray-900 mb-2">Recuperar contraseña</h1>
            <p className="dark:text-white/40 text-gray-500 text-sm">
              Ingresa tu email y te enviaremos un enlace para restablecerla
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="dark:bg-green-500/10 bg-green-50 dark:border dark:border-green-500/20 border border-green-200 dark:text-green-300 text-green-700 px-4 py-4 rounded-xl text-sm">
                Enviamos un enlace a <strong>{email}</strong>. Revisa tu bandeja de entrada.
              </div>
              <Link to="/login" className="block dark:text-white/40 dark:hover:text-white/70 text-gray-400 hover:text-gray-700 text-sm transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/20 border border-red-200 dark:text-red-300 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full dark:bg-white/[0.07] bg-white dark:border dark:border-white/15 border border-gray-300 dark:text-white text-gray-900 dark:placeholder-white/30 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none dark:focus:border-white/40 focus:border-gray-500 transition-colors text-sm dark:shadow-none shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full dark:bg-white dark:text-black bg-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <p className="text-center">
                <Link to="/login" className="dark:text-white/40 dark:hover:text-white/70 text-gray-400 hover:text-gray-700 text-sm transition-colors">
                  Volver al inicio de sesión
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
