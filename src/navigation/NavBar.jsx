import homeIcon from '../assets/images/nav/Casa.svg'
import searchIcon from '../assets/images/nav/Buscar.svg'
import addIcon from '../assets/images/nav/Mas.svg'
import mapIcon from '../assets/images/nav/Mapa.svg'
import userIcon from '../assets/images/nav/Usuario.svg'
import './NavBar.css'

const navItems = [
  { id: 'home', label: 'Inicio', icon: homeIcon },
  { id: 'search', label: 'Buscar', icon: searchIcon },
  { id: 'create', label: 'Más', icon: addIcon },
  { id: 'map', label: 'Mapa', icon: mapIcon },
  { id: 'user', label: 'Usuario', icon: userIcon },
]

function NavBar({ activePage, onNavigate }) {
  return (
    <nav className="nav-shell" aria-label="Navegación principal">
      <div className="nav-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-button ${activePage === item.id ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default NavBar
