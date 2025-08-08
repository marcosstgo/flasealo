import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getCurrentUserRole } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: 'user' | 'admin'
  isAdmin: boolean
  loading: boolean
  signUp: (email: string, password: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [loading, setLoading] = useState(true)

  const isAdmin = userRole === 'admin'

  const refreshUserRole = async () => {
    if (user) {
      try {
        const role = await getCurrentUserRole()
        setUserRole(role)
      } catch (error) {
        console.error('Error refreshing user role:', error)
        setUserRole('user')
      }
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        } else {
          console.log('Initial session:', session?.user?.email || 'No session')
        }
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          // Get user role if user exists
          if (session?.user) {
            try {
              const role = await getCurrentUserRole()
              setUserRole(role)
              console.log('User role:', role)
            } catch (roleError) {
              console.error('Error getting user role:', roleError)
              setUserRole('user')
            }
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user')
      
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Get user role when user signs in
        if (session?.user && event === 'SIGNED_IN') {
          try {
            // Add a small delay to ensure the trigger has run
            setTimeout(async () => {
              try {
                const role = await getCurrentUserRole()
                setUserRole(role)
                console.log('User role after sign in:', role)
              } catch (roleError) {
                console.error('Error getting user role on auth change:', roleError)
                setUserRole('user')
              }
            }, 1000)
          } catch (roleError) {
            console.error('Error setting up role fetch:', roleError)
            setUserRole('user')
          }
        } else if (!session?.user) {
          setUserRole('user')
        }
        
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Signing up user:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      console.log('Sign up result:', { data, error })
      
      return { data, error }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in user:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Sign in result:', { data, error })
      
      return { data, error }
    } catch (error) {
      console.error('Error in signIn:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out user')
      await supabase.auth.signOut()
      setUserRole('user')
    } catch (error) {
      console.error('Error in signOut:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    userRole,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}