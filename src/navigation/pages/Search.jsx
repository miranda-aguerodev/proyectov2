// src/navigation/pages/Search.jsx
import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './Search.css'
import './Feed.css'
import { supabase } from '../../lib/supabaseClient'
import './Placeholders.css'
import { getRankByLikes } from '../../lib/rankings'
import likeIcon from '../../assets/images/review-section/like.svg'
import dislikeIcon from '../../assets/images/review-section/dislike.svg'
import commentIcon from '../../assets/images/review-section/comment.svg'
import pinIconImg from '../../assets/images/maps-icons/pin.svg'
import userIconImg from '../../assets/images/maps-icons/yourlocation.svg'
import ReviewDetail from './ReviewDetail'

const DEFAULT_POS = { lat: 9.9281, lng: -84.0907 }

const userLocationIcon = L.icon({
  iconUrl: userIconImg,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const placePinIcon = L.icon({
  iconUrl: pinIconImg,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -34],
})

const fallbackImage =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'

const extractStoragePath = (url) => {
  if (!url) return null
  const clean = url.split('?')[0]
  const marker = '/storage/v1/object/public/'
  const idx = clean.indexOf(marker)
  if (idx === -1) return null
  return clean.slice(idx + marker.length)
}

const getSignedImageUrl = async (url) => {
  if (!url) return ''
  const path = extractStoragePath(url)
  if (!path) return url
  const [bucket, ...rest] = path.split('/')
  const objectPath = rest.join('/')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600)
  if (error) {
    console.warn('No se pudo firmar la URL de la reseña', error)
    return url
  }
  return data?.signedUrl || url
}

const Stars = ({ value }) => (
  <div className="card-stars" aria-label={`${value} estrellas`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= value ? 'star filled' : 'star'}>
        ★
      </span>
    ))}
  </div>
)

const haversine = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [routeCoords, setRouteCoords] = useState([])
  const [routeDistance, setRouteDistance] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [reviewsCache, setReviewsCache] = useState([])
  const [profileLikeTotals, setProfileLikeTotals] = useState({})
  const [cacheReady, setCacheReady] = useState(false)
  const [userPos, setUserPos] = useState(null)
  const [selectedReviewId, setSelectedReviewId] = useState(null) // 👈 para detalle

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserPos(DEFAULT_POS)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setUserPos(DEFAULT_POS)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }, [])

  const computeProfileLikes = (list) => {
    const totals = {}
    list.forEach((review) => {
      const authorId = review.profiles?.id
      if (!authorId) return
      const likes = review.votes?.filter((vote) => vote.type === 'like').length || 0
      totals[authorId] = (totals[authorId] || 0) + likes
    })
    return totals
  }

  const loadReviews = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          id, content, rating, created_at,
          places:places!reviews_place_id_fkey (name, address, latitude, longitude),
          review_images (image_url),
          review_hashtags (hashtags (tag)),
          profiles:profiles!reviews_user_id_fkey (id, username, full_name, avatar_url),
          votes (type)
        `,
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      const enriched = await Promise.all(
        (data || []).map(async (review) => {
          const cover = review.review_images?.[0]?.image_url
          const signedCover = cover ? await getSignedImageUrl(cover) : null
          const signedAvatar = review.profiles?.avatar_url
            ? await getSignedImageUrl(review.profiles.avatar_url)
            : null
          return {
            ...review,
            review_images: signedCover
              ? [{ ...review.review_images[0], image_url: signedCover }]
              : review.review_images,
            profiles: review.profiles
              ? { ...review.profiles, avatar_url: signedAvatar || review.profiles.avatar_url }
              : review.profiles,
          }
        }),
      )
      setReviewsCache(enriched)
      setProfileLikeTotals(computeProfileLikes(data || []))
      setCacheReady(true)
      return enriched
    } catch (fetchErr) {
      setError(fetchErr.message || 'No se pudieron cargar las reseñas.')
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!query.trim()) {
      setResults([])
      setSelectedReview(null)
      setSearchPerformed(true)
      return
    }
    const term = query.trim().toLowerCase()
    setSearchPerformed(true)
    let source = reviewsCache
    if (!cacheReady) {
      source = await loadReviews()
    }
    const filtered = (source || []).filter((review) => {
      const placeName = review.places?.name?.toLowerCase() || ''
      const content = review.content?.toLowerCase() || ''
      const tags =
        review.review_hashtags?.map((tag) => tag.hashtags?.tag?.toLowerCase() || '').join(' ') ||
        ''
      return placeName.includes(term) || content.includes(term) || tags.includes(term)
    })
    setResults(filtered)
    setSelectedReview(filtered[0] || null)
    if (filtered[0]) {
      fetchRoute(filtered[0])
    }
  }

  const fetchRoute = async (review) => {
    if (!review?.places?.latitude || !userPos) {
      setRouteCoords([])
      setRouteDistance(null)
      return
    }
    setRouteLoading(true)
    const destination = {
      lat: review.places.latitude,
      lng: review.places.longitude,
    }
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userPos.lng},${userPos.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('No se pudo obtener la ruta')
      }
      const data = await response.json()
      if (data.routes?.length) {
        const route = data.routes[0]
        const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        setRouteCoords(coords)
        setRouteDistance(route.distance / 1000)
      } else {
        throw new Error('No hay rutas disponibles')
      }
    } catch (err) {
      setRouteCoords([
        [userPos.lat, userPos.lng],
        [destination.lat, destination.lng],
      ])
      setRouteDistance(haversine(userPos, destination))
    } finally {
      setRouteLoading(false)
    }
  }

  const handleSelectReview = (review) => {
    setSelectedReview(review)
    fetchRoute(review)
  }

  const center = useMemo(() => {
    if (selectedReview?.places?.latitude && selectedReview?.places?.longitude) {
      return { lat: selectedReview.places.latitude, lng: selectedReview.places.longitude }
    }
    return userPos || DEFAULT_POS
  }, [selectedReview, userPos])

  return (
    <section className="search-page">
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Busca lugares, reseñas u #hashtags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>
      {error && <p className="muted error">{error}</p>}
      {searchPerformed && results.length === 0 && !loading && (
        <p className="muted search-empty">No encontramos reseñas que coincidan con tu búsqueda.</p>
      )}
      <div className="search-results">
        {results.map((review) => {
          const coverImage =
            review.review_images?.[0]?.image_url || review.review_images?.image_url || fallbackImage
          const authorId = review.profiles?.id
          const authorLikes = authorId ? profileLikeTotals[authorId] || 0 : 0
          const rankInfo = getRankByLikes(authorLikes)
          const initialsSeed = (
            review.profiles?.full_name ||
            review.profiles?.username ||
            'U'
          ).replace(/^@+/, '')
          const initial = initialsSeed.charAt(0).toUpperCase()
          const likesCount = review.votes?.filter((v) => v.type === 'like').length || 0
          const dislikesCount = review.votes?.filter((v) => v.type === 'dislike').length || 0

          return (
            <article key={review.id} className="review-card search-result-card">
              <div className="review-image" onClick={() => setSelectedReviewId(review.id)} style={{ cursor: 'pointer' }}>
                <img src={coverImage} alt={review.places?.name || 'Lugar'} />
                <div className="review-meta-top">
                  <div className="author">
                    <div className="author-avatar">
                      {review.profiles?.avatar_url ? (
                        <img
                          src={review.profiles.avatar_url}
                          alt={review.profiles.username || 'avatar'}
                        />
                      ) : (
                        <span className="avatar-fallback">{initial}</span>
                      )}
                      {rankInfo?.frame && (
                        <img src={rankInfo.frame} alt="" aria-hidden="true" className="rank-frame" />
                      )}
                    </div>
                    <div>
                      <p className="author-name">
                        {review.profiles?.full_name || review.profiles?.username || 'Usuario'}
                      </p>
                      <p className="author-handle">{review.profiles?.username || ''}</p>
                    </div>
                  </div>
                  <span className="created">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="review-body">
                <h3
                  onClick={() => setSelectedReviewId(review.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {review.places?.name || 'Lugar sin nombre'}
                </h3>
                <p className="description">{review.content || 'Sin descripción'}</p>
                <Stars value={review.rating || 0} />
                {review.review_hashtags?.length > 0 && (
                  <div className="tags">
                    {review.review_hashtags
                      .map((entry) => entry.hashtags?.tag)
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                  </div>
                )}

                <div className="action-row">
                  <div className="pill like">
                    <img src={likeIcon} alt="" />
                    <span>{likesCount}</span>
                  </div>
                  <div className="pill dislike">
                    <img src={dislikeIcon} alt="" />
                    <span>{dislikesCount}</span>
                  </div>
                  <div className="pill comment">
                    <img src={commentIcon} alt="" />
                    {/* en search no cargamos comentarios, solo mostramos ícono */}
                    <span>Ver</span>
                  </div>
                </div>

                <div className="result-actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => handleSelectReview(review)}
                  >
                    Ver en mapa
                  </button>
                  <button
                    className="primary small"
                    type="button"
                    onClick={() => setSelectedReviewId(review.id)}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {selectedReview && (
        <div className="search-map-panel">
          <div className="route-info">
            <div>
              <p className="muted small">Ruta hacia</p>
              <h3>{selectedReview.places?.name || 'Lugar sin nombre'}</h3>
              <p className="muted small">{selectedReview.places?.address || 'Sin dirección'}</p>
            </div>
            <div>
              {routeLoading && <p className="muted small">Calculando ruta...</p>}
              {!routeLoading && routeDistance && (
                <p className="muted small">
                  Distancia aprox: {routeDistance.toFixed(1)} km
                </p>
              )}
            </div>
          </div>

          <div className="search-map-wrapper">
            <MapContainer
              center={center}
              zoom={13}
              scrollWheelZoom
              key={`${center.lat}-${center.lng}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {userPos && <Marker position={userPos} icon={userLocationIcon} />}
              {selectedReview?.places?.latitude && (
                <Marker
                  position={{
                    lat: selectedReview.places.latitude,
                    lng: selectedReview.places.longitude,
                  }}
                  icon={placePinIcon}
                />
              )}
              {routeCoords.length > 1 && (
                <Polyline positions={routeCoords} color="#38bdf8" weight={5} />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {selectedReviewId && (
        <ReviewDetail
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}
    </section>
  )
}

export default SearchPage
