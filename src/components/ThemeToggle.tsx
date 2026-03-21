import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/50 dark:hover:text-white bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
