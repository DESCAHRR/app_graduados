# Generador de Graduados (Movil)

Aplicacion web para registrar graduados y generar imagenes verticales listas para redes sociales (WhatsApp/Facebook).

## Funcionalidades

- Registro de estudiantes (nombre, modalidad, fecha, foto/avatar)
- Almacenamiento en base de datos SQLite
- Lista de registros con opcion de seleccionar o eliminar
- Generacion visual de plantilla vertical tipo movil (1080x1920)
- Descarga de imagen final en PNG

## Requisitos

- Node.js 18+ recomendado

## Ejecucion

```bash
npm install
npm start
```

Abrir en navegador:

- http://localhost:3000

## API disponible

- `GET /api/students` -> lista estudiantes
- `GET /api/students/:id` -> detalle de un estudiante
- `POST /api/students` -> crear (form-data)
- `PUT /api/students/:id` -> actualizar (form-data)
- `DELETE /api/students/:id` -> eliminar

## Estructura

- `server.js`: backend Express + SQLite
- `public/`: frontend movil
- `uploads/`: fotos subidas (se crea automaticamente)
- `data/graduados.db`: base de datos SQLite (se crea automaticamente)

## Despliegue online sugerido

Puedes desplegarla en un VPS o servicios Node.js (Render, Railway, Fly.io, etc.).
Para produccion, conviene:

- mover archivos subidos a almacenamiento externo (S3 o similar)
- proteger endpoints con login
- agregar backups de la base de datos
