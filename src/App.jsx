// src/App.jsx
import { useEffect, useState } from 'react'
import './App.css'
import NavBar from './navigation/NavBar'
import HomePage from './navigation/pages/Home'
import SearchPage from './navigation/pages/Search'
import CreatePage from './navigation/pages/Create'
import MapPage from './navigation/pages/Map'
import UserPage from './navigation/pages/User'
import ReviewDetailPage from './navigation/pages/ReviewDetail'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './navigation/pages/LoginPage'  // 👈 IMPORTANTE

const pages = {
  home: HomePage,
  search: SearchPage,
  create: CreatePage,
  map: MapPage,
  user: UserPage,
  review: ReviewDetailPage,
}

function App() {
  const { user, loading } = useAuth()
  const [activePage, setActivePage] = useState(() => {
    const flag = localStorage.getItem('goToUser')
    if (flag) {
      localStorage.removeItem('goToUser')
      return 'user'
    }
    return 'home'
  })

  useEffect(() => {
    const testSupabase = async () => {
      const { data, error } = await supabase.from('places').select('*').limit(5)
      if (error) {
        console.error('Supabase test (places) failed:', error.message)
        return
      }
      console.info('Supabase test (places) ok. Sample rows:', data)
    }

    testSupabase()
  }, [])

  const CurrentPage = pages[activePage] ?? HomePage

  if (loading) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <p>Cargando tu sesión...</p>
        </div>
      </div>
    )
  }

  // 👇 AHORA, si no hay user, usamos LoginPage
  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="app-shell">
      <main className="page-area">
        <CurrentPage />
      </main>

      <NavBar activePage={activePage} onNavigate={setActivePage} />
    </div>
  )
}

export default App
