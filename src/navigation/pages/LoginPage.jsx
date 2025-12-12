// src/navigation/pages/LoginScreen.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import luggoLogo from '../../assets/images/icono LugGO/luggo.svg'
import './Login.css'

function LoginPage() {
  const { loginWithGoogle, signUpWithEmail } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!email.trim()) {
      setError('Ingresa un correo electrónico.')
      return
    }

    if (mode !== 'reset' && !password) {
      setError('Ingresa una contraseña.')
      return
    }

    if (mode === 'register' && password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // Cuando el login funciona, AuthContext detecta la sesión y App deja de mostrar esta pantalla
      } else if (mode === 'register') {
        const { error } = await signUpWithEmail(email, password, fullName)
        if (error) throw error
        setMessage(
          'Cuenta creada. Si tu proyecto lo requiere, revisa tu correo para confirmar la dirección.',
        )
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        })
        if (error) throw error
        setMessage('Te enviamos un correo para restablecer tu contraseña.')
      }
    } catch (err) {
      setError(err?.message ?? 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    clearFeedback()
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err?.message ?? 'No se pudo iniciar sesión con Google.')
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-card login-card">
        <img src={luggoLogo} alt="LugGO" className="auth-logo" />
        <h1 className="auth-title">LugGO</h1>
        <p className="auth-subtitle">
          Inicia sesión para unirte y compartir reseñas.
        </p>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('login')
              clearFeedback()
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('register')
              clearFeedback()
            }}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            className={mode === 'reset' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('reset')
              clearFeedback()
            }}
          >
            Recuperar clave
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
            />
          </label>

          {mode === 'register' && (
            <label>
              Nombre completo
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </label>
          )}

          {mode !== 'reset' && (
            <label>
              Contraseña
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
          )}

          {mode === 'register' && (
            <label>
              Confirmar contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña"
              />
            </label>
          )}

          {error && <p className="auth-feedback error">{error}</p>}
          {message && <p className="auth-feedback ok">{message}</p>}

          <button className="primary full" type="submit" disabled={busy}>
            {mode === 'login' && (busy ? 'Entrando...' : 'Entrar')}
            {mode === 'register' && (busy ? 'Creando cuenta...' : 'Registrarme')}
            {mode === 'reset' && (busy ? 'Enviando correo...' : 'Enviar enlace')}
          </button>
        </form>

        <div className="login-divider">
          <span />
          <p>o</p>
          <span />
        </div>

        <button
          className="primary full google-alt"
          type="button"
          onClick={handleGoogle}
          disabled={busy}
        >
          Entrar con Google
        </button>
      </div>
    </div>
  )
}

export default LoginPage
