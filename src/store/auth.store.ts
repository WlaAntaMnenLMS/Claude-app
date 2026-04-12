import { create } from 'zustand'

export interface AppUser {
  id: number
  name: string
  email: string
  role: 'manager' | 'specialist'
  avatar?: string
}

interface AuthState {
  user: AppUser | null
  setUser: (u: AppUser | null) => void
  isManager: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  isManager: () => get().user?.role === 'manager',
}))
