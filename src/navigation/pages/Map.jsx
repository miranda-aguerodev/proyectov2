import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import yourLocationIcon from '../../assets/images/maps-icons/yourlocation.svg'
import pinIconImg from '../../assets/images/maps-icons/pin.svg'
import 'leaflet/dist/leaflet.css'
import './Placeholders.css'
import { supabase } from '../../lib/supabaseClient'

const DEFAULT_POS = { lat: 9.9281, lng: -84.0907 } // San José, CR fallback

L.Icon.Default.mergeOptions({
  iconUrl: pinIconImg,
  iconRetinaUrl: pinIconImg,
  shadowUrl: null,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -34],
})

const myLocationIcon = L.icon({
  iconUrl: yourLocationIcon,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -12],
})

const placePinIcon = L.icon({
  iconUrl: pinIconImg,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -34],
})

const extractStoragePath = (url) => {
  if (!url) return null
  if (url.startsWith('http')) {
    const marker = '/storage/v1/object/public/'
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.slice(idx + marker.length)
  }
  return url
}

const getSignedUrlIfNeeded = async (url) => {
  if (!url) return ''
  const path = extractStoragePath(url)
  if (!path) return url
  const [bucket, ...rest] = path.split('/')
  const objectPath = rest.join('/')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600)
  if (error) {
    console.warn('No se pudo firmar la URL del avatar', error)
    return url
  }
  return data?.signedUrl || url
}

const enrichReviewAvatar = async (review) => {
  if (!review?.profiles?.avatar_url) return review
  const signed = await getSignedUrlIfNeeded(review.profiles.avatar_url)
  return {
    ...review,
    profiles: { ...review.profiles, avatar_url: signed },
  }
}

function RecenterOnLocation({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.2 })
    }
  }, [position, map])

  return null
}

function MapPage() {
  const [userPos, setUserPos] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [places, setPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(true)
  const [placesError, setPlacesError] = useState('')
  const [locating, setLocating] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [placeReviews, setPlaceReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewedPlaceIds, setReviewedPlaceIds] = useState(new Set())

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Tu navegador no permite geolocalización.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setErrorMsg('')
        setLocating(false)
      },
      (err) => {
        setUserPos(DEFAULT_POS)
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Necesitas conceder permiso de ubicación (https) para ver tu posición.'
            : 'No pudimos obtener tu ubicación, usando un punto por defecto.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoadingPlaces(true)
      setPlacesError('')
      try {
        const { data, error } = await supabase
          .from('places')
          .select('id, name, address, latitude, longitude')

        if (error) {
          throw error
        }
        const normalized = (data || []).filter(
          (p) =>
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !Number.isNaN(p.latitude) &&
            !Number.isNaN(p.longitude),
        )
        setPlaces(normalized)
      } catch (error) {
        setPlacesError(error?.message ?? 'No se pudieron cargar lugares.')
      } finally {
        setLoadingPlaces(false)
      }
    }

    const fetchReviewedPlaceIds = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('place_id')
        .not('place_id', 'is', null)
      if (error) {
        console.warn('No se pudo cargar el estado de reseñas', error)
        setReviewedPlaceIds(new Set())
        return
      }
      setReviewedPlaceIds(new Set((data || []).map((row) => row.place_id)))
    }

    fetchPlaces()
    fetchReviewedPlaceIds()
  }, [])

  const center = useMemo(() => userPos || DEFAULT_POS, [userPos])

  const loadPlaceReviews = async (placeId) => {
    setLoadingReviews(true)
    setReviewsError('')
    setPlaceReviews([])
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          id, rating, content, created_at,
          profiles:profiles!reviews_user_id_fkey (id, username, full_name, avatar_url)
        `,
        )
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const enriched = await Promise.all((data || []).map((review) => enrichReviewAvatar(review)))
      setPlaceReviews(enriched)
    } catch (error) {
      setReviewsError(error?.message ?? 'No se pudieron cargar las reseñas.')
    } finally {
      setLoadingReviews(false)
    }
  }

  const openReviewPanel = (place) => {
    setSelectedPlace(place)
    setPanelOpen(true)
    loadPlaceReviews(place.id)
  }

  return (
    <section className={`map-card ${panelOpen ? 'panel-open' : ''}`}>
      <div className="map-header">
        <div>
          <p className="muted small">Proveedor · OpenStreetMap </p>
          <h2>Mapa interactivo</h2>
          
        </div>
        <div className="map-actions">
          <button className="secondary" type="button" onClick={requestLocation} disabled={locating}>
            {locating ? 'Obteniendo ubicación...' : 'Usar mi ubicación'}
          </button>
          {errorMsg && <p className="muted small">{errorMsg}</p>}
          {placesError && <p className="muted small">{placesError}</p>}
        </div>
      </div>

      <div className="map-wrapper">
        {!panelOpen ? (
          <MapContainer center={center} zoom={userPos ? 15 : 13} scrollWheelZoom>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {userPos && (
              <Marker position={center} icon={myLocationIcon}>
                <Popup>Tu posición aproximada</Popup>
              </Marker>
            )}
            {!userPos && (
              <Marker position={center} icon={placePinIcon}>
                <Popup>Ubicación por defecto</Popup>
              </Marker>
            )}
            {!loadingPlaces &&
              places
                .filter((place) => reviewedPlaceIds.has(place.id))
                .map((place) => (
                  <Marker
                    key={place.id}
                    position={{ lat: place.latitude, lng: place.longitude }}
                    icon={placePinIcon}
                    eventHandlers={{
                      click: () => openReviewPanel(place),
                    }}
                  >
                    <Popup>
                      <strong>{place.name}</strong>
                      <br />
                      {place.address || 'Sin dirección'}
                    </Popup>
                  </Marker>
                ))}
            <RecenterOnLocation position={userPos} />
          </MapContainer>
        ) : (
          <div className="map-collapsed">
            <p>Mapa oculto mientras revisas las reseñas de este lugar.</p>
            <p className="muted small">Cierra el panel para volver al mapa.</p>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="map-review-overlay" onClick={() => setPanelOpen(false)}>
          <div className="map-review-card" onClick={(e) => e.stopPropagation()}>
            <div className="map-review-header">
              <div>
                <p className="muted small">Reseñas del lugar</p>
                <h3>{selectedPlace?.name || 'Lugar sin nombre'}</h3>
                <p className="muted small">{selectedPlace?.address || 'Sin dirección'}</p>
              </div>
              <button className="text-link" type="button" onClick={() => setPanelOpen(false)}>
                Cerrar
              </button>
            </div>
            {loadingReviews && <p className="muted">Cargando reseñas...</p>}
            {reviewsError && <p className="muted error">{reviewsError}</p>}
            {!loadingReviews && !reviewsError && placeReviews.length === 0 && (
              <p className="muted">Aún no hay reseñas para este lugar.</p>
            )}
            <div className="review-list">
              {placeReviews.map((review) => (
                <article key={review.id} className="mini-review">
                  <div className="mini-review-header">
                    <div className="mini-review-avatar">
                      {review.profiles?.avatar_url ? (
                        <img
                          src={review.profiles.avatar_url}
                          alt={review.profiles.username || 'avatar'}
                        />
                      ) : (
                        <span>
                          {(review.profiles?.username || 'U').replace(/^@+/, '').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="mini-review-name">
                        {review.profiles?.full_name || review.profiles?.username || 'Usuario'}
                      </p>
                      <p className="mini-review-meta">
                        {review.profiles?.username || ''} ·{' '}
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="mini-review-rating">{'★'.repeat(review.rating || 0)}</span>
                  </div>
                  <p className="mini-review-content">{review.content || 'Sin descripción'}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default MapPage
