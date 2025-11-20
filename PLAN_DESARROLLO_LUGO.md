# Plan de Desarrollo del Proyecto Lugo

## Descripción general
Lugo será una red social de reseñas de lugares (restaurantes, cafeterías, sitios turísticos) con React en el frontend y Supabase como backend. Permitirá el registro y autenticación de usuarios, la publicación de reseñas con calificación por estrellas, la interacción mediante likes/dislikes, el seguimiento entre cuentas y un mapa interactivo que muestre todos los lugares reseñados. Mantendrá las funcionalidades de la versión previa del proyecto, replanteadas sobre la nueva arquitectura, e incorporará mejoras como un sistema de confianza para garantizar la autenticidad de las reseñas.

## Paso 1: Arquitectura del proyecto y configuración inicial 🏗️

### 1. Stack tecnológico
- React (idealmente creado con Vite) para la construcción del UI moderno.
- Supabase como plataforma BaaS (PostgreSQL, autenticación, almacenamiento, realtime) en lugar de Firebase o un backend Node/Express.
- Mantener la posibilidad de usar Firebase solo para servicios complementarios (analytics, push, hosting estático) si surgen necesidades específicas, pero no para la lógica central.

### 2. Inicializar el frontend
- Generar el proyecto base ejecutando `npm create vite@latest lugo -- --template react`.
- Entrar en la carpeta `lugo` e instalar `@supabase/supabase-js` con `npm install @supabase/supabase-js`.
- Configurar variables de entorno en `.env.local`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Crear un módulo `src/lib/supabaseClient.js` (o similar) que exporte el cliente Supabase mediante `createClient`.
- En el arranque de la aplicación (por ejemplo `src/main.jsx`), importar el cliente y ponerlo a disposición de los componentes que lo necesiten.
- Probar la conexión realizando una consulta sencilla (`supabase.from('instruments').select('*')`) para confirmar la comunicación.

### 3. Proyecto Supabase
- Crear el proyecto en el dashboard de Supabase y obtener la URL y las llaves necesarias.
- Configurar los valores en `.env.local` y verificar que React puede usar el cliente correctamente.

### 4. Documentación inicial y estructura de archivos
- Crear un `README.md` que describa el objetivo de Lugo, las versiones recomendadas de Node/NPM y los comandos principales (`npm run dev`).
- Documentar la estructura de archivos y destacar el directorio para recursos estáticos.
- Crear `src/assets/images/` con subcarpetas enfocadas: `nav/` para íconos de navegación (home, search, add, map, profile), `profile/` para avatars o placeholders genéricos, y `actions/` para íconos de interacción (like, dislike, follow, etc.).
- Indicar qué tipo de assets deben colocarse en cada subcarpeta para que diseñadores o desarrolladores sepan dónde añadir los recursos fijos.

### 5. Resultado esperado
- El proyecto React ya existe y está conectado a Supabase con un cliente funcional.
- La estructura de carpetas incluye el espacio para recursos estáticos documentado en README.
- El equipo sabe cómo iniciar la app (`npm run dev`) y dónde depositar los iconos y placeholders necesarios.
