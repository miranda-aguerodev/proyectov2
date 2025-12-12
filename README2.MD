# Proyecto Final – Plataforma de Reseñas

Aplicación web para crear, explorar e interactuar con reseñas de lugares.  
Incluye autenticación con email y una vista de detalle de reseñas, con mejoras enfocadas en experiencia de usuario y seguridad.

---

## Tecnologías utilizadas

- **Frontend:** React + Vite  
- **Backend / Auth / DB:** Supabase  
- **Base de datos:** PostgreSQL  
- **Estilos:** CSS modular  
- **Control de versiones:** Git + GitHub  

---

## Autenticación

La aplicación utiliza **Supabase Auth** con autenticación basada en email:

- Registro con email y contraseña  
- Inicio de sesión con email  
- Recuperación de contraseña por correo electrónico  
- Persistencia de sesión  

---

## Funcionalidades implementadas

- Crear cuenta con email  
- Iniciar sesión con email  
- Recuperar contraseña  
- Ajustes en el flujo visual de “Agregar reseña”  
- Vista de detalle de reseña (Review Detail)  

---

## Estructura general del proyecto

```text
src/
├── components/
├── pages/
├── context/
├── services/
├── styles/
└── supabaseClient.js
---

## Variables de entorno
Este proyecto utiliza variables de entorno que NO se suben a GitHub.

Ejemplo de archivo .env:

env

VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
Nota: si usás email reset con redirect, también puede aplicar algo como VITE_SITE_URL (depende de cómo lo configuraste).
---

## Instalación y ejecución local
npm install
npm run dev

#Cambios realizados respecto al esquema inicial
El proyecto partió de un esquema base de base de datos previamente definido.
Durante el desarrollo se realizaron ajustes específicos, enfocados en autenticación y experiencia de usuario.

##Autenticación con email
Se implementó autenticación con Supabase Auth, incorporando:

-Registro de usuarios con email y contraseña

-Inicio de sesión con email

-Recuperación de contraseña mediante correo electrónico

-Persistencia de sesión al recargar la aplicación

Cambios asociados:


-Configuración de Supabase Auth para email

-Políticas RLS para permitir operaciones necesarias luego de autenticarse (por ejemplo, creación/edición de perfil cuando aplique)

##Ajustes en el flujo de “Agregar reseña”

Durante el flujo de agregar reseña, se hicieron mejoras de UX:

-Se modificó la visualización de los lugares cercanos, ocultándolos dinámicamente según el estado del formulario.

Estos cambios no alteran la estructura de la reseña, sino la presentación y el flujo de interacción.

##Vista de detalle de reseña (Review Detail)
Se implementó una vista de detalle que no existía en la versión inicial.

Permite:

-Ver la información completa de una reseña

-Mostrar imagen, calificación, texto, autor y comentarios

-Navegar desde el feed hacia el detalle sin recargar la página

##Seguridad (Row Level Security)
Se activó y configuró Row Level Security (RLS) para:

-Permitir inserción de datos únicamente por usuarios autenticados

-Controlar acceso a datos según sesión

-Evitar errores por permisos al operar después del login (por ejemplo, perfil/votos/comentarios, según aplique en el proyecto)