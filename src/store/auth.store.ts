import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AppUser {
  id: string
  name: string
  email: string
  role: 'manager' | 'specialist'
  avatar?: string
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  setUser: (u: AppUser | null) => void
  isManager: () => boolean
  signOut: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  setUser: (u) => set({ user: u }),

  isManager: () => get().user?.role === 'manager',

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  loadSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        set({
          user: {
            id: session.user.id,
            name: profile.name,
            email: session.user.email ?? '',
            role: profile.role as 'manager' | 'specialist',
            avatar: profile.avatar,
          },
          loading: false,
        })
        return
      }
    }
    set({ user: null, loading: false })
  },
}))
