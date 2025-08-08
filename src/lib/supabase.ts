import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'flashealo-web'
    }
  }
})

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          description: string | null
          is_public: boolean
          slug: string
          user_id: string
          qr_code_url: string | null
          created_at: string
          updated_at: string
          allow_downloads: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_public?: boolean
          slug: string
          user_id: string
          qr_code_url?: string | null
          created_at?: string
          updated_at?: string
          allow_downloads?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          slug?: string
          user_id?: string
          qr_code_url?: string | null
          created_at?: string
          updated_at?: string
          allow_downloads?: boolean
        }
      }
      photos: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          image_path: string
          status: 'pending' | 'approved' | 'rejected'
          format: string
          size: number
          created_at: string
          updated_at: string
          uploader_name: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          image_path: string
          status?: 'pending' | 'approved' | 'rejected'
          format: string
          size: number
          created_at?: string
          updated_at?: string
          uploader_name?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          image_path?: string
          status?: 'pending' | 'approved' | 'rejected'
          format?: string
          size?: number
          created_at?: string
          updated_at?: string
          uploader_name?: string | null
        }
      }
      subscriptions: {
        Row: {
          user_id: string
          plan: 'free' | 'pro'
          custom_branding: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          plan?: 'free' | 'pro'
          custom_branding?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          plan?: 'free' | 'pro'
          custom_branding?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'user' | 'admin'
          can_create_event: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: 'user' | 'admin'
          can_create_event?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: 'user' | 'admin'
          can_create_event?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { user_uuid?: string }
        Returns: string
      }
      can_create_events: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
    }
  }
}

// Helper function to check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin')
    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }
    return data || false
  } catch (error) {
    console.error('Error in isCurrentUserAdmin:', error)
    return false
  }
}

// Helper function to get current user role
export async function getCurrentUserRole(): Promise<'user' | 'admin'> {
  try {
    const { data, error } = await supabase.rpc('get_user_role')
    if (error) {
      console.error('Error getting user role:', error)
      return 'user'
    }
    return (data as 'user' | 'admin') || 'user'
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error)
    return 'user'
  }
}

// Helper function to check if current user can create events
export async function canCurrentUserCreateEvents(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_create_events')
    if (error) {
      console.error('Error checking event creation permission:', error)
      return false
    }
    return data || false
  } catch (error) {
    console.error('Error in canCurrentUserCreateEvents:', error)
    return false
  }
}

// Helper function to delete a user (admin only)
export async function deleteUserById(userId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No access token available')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete user')
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Database connection error:', error)
    return false
  }
}

// Helper function to test Supabase configuration
export async function testSupabaseConnection(): Promise<{
  success: boolean
  error?: string
  details?: any
}> {
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    // Test database access
    const { error: dbError } = await supabase
      .from('events')
      .select('count')
      .limit(1)

    if (dbError) {
      return {
        success: false,
        error: `Database error: ${dbError.message}`,
        details: dbError
      }
    }

    return {
      success: true,
      details: {
        session: !!data.session,
        user: data.session?.user?.email || 'No user'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
      details: error
    }
  }
}