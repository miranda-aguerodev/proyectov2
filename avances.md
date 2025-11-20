# Registro de avances del proyecto

## Configuración y dependencias
- Creación de `supabaseClient` para toda la app.
- Configuración de mapas (Leaflet + OSRM) y firmas de URL para imágenes (profile y reseñas).

## Navegación y UI general
- Barra inferior/vertical con íconos SVG personalizados.
- Aplicación de gradientes oscuros, fondos translúcidos y estilos coherentes en todas las pantallas (Home, Usuario, Buscar, Mapa).

## Autenticación y perfil de usuario
- `AuthScreen` maneja login con Google, edición de perfil, cropping de avatar (480p) y guardado inmediato.
- Estado de autenticación global (`AuthContext`) + almacenamiento de perfil en Supabase.
- Limpieza de buckets (profile/resennas) y reseñas para admins.

## Feed (Home)
- Tarjetas con imágenes firmadas, autor, rangos, hashtags, rating, likes/dislikes/comentarios.
- Comentarios en vivo con carga perezosa, inputs y recuentos.
- Avatares firmados también para comentarios.
- Reordenamiento priorizando usuarios seguidos; botón Seguir/Dejar de seguir.
- Barra para buscar reseñas por usuario (filtra por username/full_name).
- Función `rankIconFor` con 4 rangos (rookie, explorer, pro, legend) y SVG respectivos.
- Manejo de follow (tabla `followers`), votación (`votes`) y comentarios (`review_comments`).

## Sección Usuario
- Reutilización del card del feed para listar las reseñas del perfil actual.
- Firmado de imágenes/avatares igual que en Home.
- Likes/dislikes/comentarios visibles; panel de comentarios se muestra siempre.
- Checkboxes por reseña + toolbar para eliminación masiva (confirmación y cascade delete).

## Buscar lugares
- Implementación completa con barra de búsqueda, filtrado por usuario/lugar/hashtag.
- Resultados reutilizan el card de reseña.
- Panel de mapa con ruta desde la ubicación del usuario (OSRM), distancia aproximada y pines personalizados.

## Mapa
- Marcadores sólo para lugares con reseñas existentes; panel lateral con reseñas del lugar seleccionado.
- Firmado de avatares/comentarios y rutas entre ubicación del usuario y lugar.

## Extras
- Carpeta `src/assets/images/rangos/` con 4 SVG simples (rookie, explorer, pro, legend).
- Estilos adicionales (`Feed.css`, `User.css`, `Search.css`) para barra de usuario, follow, rangos y tarjetas.

Este documento cubre todo lo implementado hasta la fecha: autenticación, perfil, feed interactivo, sección de usuario, búsqueda avanzada, mapa con rutas, seguimiento/rangos y limpieza de almacenamiento.
