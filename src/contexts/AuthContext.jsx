// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  saveProfile: async () => {},
  signUpWithEmail: async () => ({ data: null, error: null }),
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
    let cancelled = false

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error obteniendo sesión inicial', error)
        }

        const currentUser = data?.session?.user ?? null

        if (!cancelled) {
          setUser(currentUser)
          await fetchProfile(currentUser?.id ?? null)
        }
      } catch (err) {
        console.error('Error inesperado en init()', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      fetchProfile(nextUser?.id ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const resolveRedirectTo = () => {
    const envSite =
      import.meta.env.VITE_SITE_URL ||
      import.meta.env.PUBLIC_SITE_URL ||
      import.meta.env.SUPABASE_SITE_URL ||
      ''
    const normalizedEnv = envSite ? envSite.replace(/\/+$/, '') : ''

    if (normalizedEnv) return normalizedEnv
    if (typeof window !== 'undefined') return window.location.origin
    return 'http://localhost:5173'
  }

  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${resolveRedirectTo()}/`,
      },
    })

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[Auth] Error al cerrar sesión', err)
    }
    setUser(null)
    setProfile(null)
  }

  // Registro con correo + contraseña que crea perfil en `profiles`
  const signUpWithEmail = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
        },
      },
    })

    if (error) {
      console.error('Error en signUp:', error)
      return { data: null, error }
    }

    const createdUser = data.user

    if (createdUser) {
      const { id } = createdUser

      const { error: profileError } = await supabase.from('profiles').insert({
        id,
        full_name: fullName || null,
        username: null,
        avatar_url: null,
        reputation_score: 0,
        reputation_level: 'novato',
      })

      if (profileError) {
        console.error('Error creando perfil:', profileError)
        return { data, error: profileError }
      }
    }

    return { data, error: null }
  }

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
      value={{
        user,
        profile,
        loading,
        loginWithGoogle,
        logout,
        saveProfile,
        signUpWithEmail,
      }}
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
