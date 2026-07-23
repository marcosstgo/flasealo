import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getCurrentUserRole, canCurrentUserCreateEvents } from '../lib/supabase'

interface TrialInfo {
  in_trial: boolean
  trial_ends_at: string | null
  days_remaining: number
  trial_expired: boolean
  has_permanent_access: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: 'user' | 'admin'
  isAdmin: boolean
  canCreateEvents: boolean
  trialInfo: TrialInfo | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [canCreateEvents, setCanCreateEvents] = useState(false)
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
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

  const refreshPermissions = async () => {
    if (user) {
      try {
        const [role, canCreate, trialData] = await Promise.all([
          getCurrentUserRole(),
          canCurrentUserCreateEvents(),
          supabase.rpc('get_trial_info'),
        ])
        setUserRole(role)
        setCanCreateEvents(canCreate)
        if (trialData.data && !trialData.error) {
          setTrialInfo(trialData.data as TrialInfo)
        }
      } catch (error) {
        console.error('Error refreshing permissions:', error)
        setUserRole('user')
        setCanCreateEvents(false)
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            try {
              const [role, canCreate] = await Promise.all([
                getCurrentUserRole(),
                canCurrentUserCreateEvents()
              ])
              setUserRole(role)
              setCanCreateEvents(canCreate)
            } catch (roleError) {
              console.error('Error getting user permissions:', roleError)
              setUserRole('user')
              setCanCreateEvents(false)
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              const [role, canCreate] = await Promise.all([
                getCurrentUserRole(),
                canCurrentUserCreateEvents()
              ])
              setUserRole(role)
              setCanCreateEvents(canCreate)
            } catch (roleError) {
              console.error('Error getting user permissions on auth change:', roleError)
              setUserRole('user')
              setCanCreateEvents(false)
            }
          }, 1000)
        } else if (!session?.user) {
          setUserRole('user')
          setCanCreateEvents(false)
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      return { data, error }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (error) {
      console.error('Error in signIn:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUserRole('user')
      setCanCreateEvents(false)
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
    canCreateEvents,
    trialInfo,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserRole,
    refreshPermissions,
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