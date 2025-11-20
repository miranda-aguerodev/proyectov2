import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  saveProfile: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('No se pudo cargar el perfil', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUser(session?.user ?? null)
      await fetchProfile(session?.user?.id ?? null)
      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      fetchProfile(nextUser?.id ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
    })

  const logout = () => supabase.auth.signOut()

  const saveProfile = async ({ username, fullName, avatarUrl }) => {
    if (!user) {
      throw new Error('Debes iniciar sesión antes de guardar el perfil')
    }

    const sanitizedUsername = username?.trim().replace(/^@+/, '')
    const formattedFullName = fullName?.trim() || null
    const finalUsername = sanitizedUsername ? `@${sanitizedUsername}` : null

    if (finalUsername) {
      const { data: conflict, error: conflictError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', finalUsername)
        .neq('id', user.id)
        .maybeSingle()

      if (conflictError && conflictError.code !== 'PGRST116') {
        throw conflictError
      }

      if (conflict) {
        throw new Error('Ese nombre de usuario ya está en uso.')
      }
    }

    const payload = {
      id: user.id,
      username: finalUsername,
      full_name: formattedFullName,
      avatar_url: avatarUrl || null,
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single()

    if (error) {
      throw error
    }

    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, loginWithGoogle, logout, saveProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe ejecutarse dentro de AuthProvider')
  }

  return context
}
