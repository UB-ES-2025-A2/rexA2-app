# Rex – Route Experience

**Rex (Route Experience)** es una plataforma **web social** centrada en **rutas turísticas y gastronómicas**.  
Permite a los usuarios **explorar, crear y compartir experiencias de viaje**, descubrir nuevas rutas y **conectarse con otras personas** para realizarlas en grupo.

La aplicación combina **descubrimiento, interacción y comunidad**, ofreciendo funcionalidades como:

- Exploración de rutas experienciales con filtros por tipo (gastronomía, cultura, naturaleza) y duración.
- Mapas interactivos con puntos de interés y rutas cercanas.
- Valoración y reseñas de rutas por parte de los usuarios.
- Creación de grupos para organizar rutas con amigos o nuevos viajeros.
- Alertas sobre rutas populares o grupos activos cerca de ti.

> Rex busca inspirar a los viajeros a vivir experiencias auténticas y conectar con personas afines a través del turismo local y la gastronomía.

---

## Stack Tecnológico

**Frontend**

- [React](https://react.dev/) con JavaScript/TypeScript
- [Mapbox](https://www.mapbox.com/) para mapas interactivos

**Backend**

- [FastAPI](https://fastapi.tiangolo.com/) en Python
- [MongoDB](https://www.mongodb.com/) como base de datos NoSQL
- Integración con servicios de geocoding (Mapbox / OpenStreetMap)

**Infraestructura**

- Despliegue en **Microsoft Azure**
- API REST segura con autenticación JWT

## API: imágenes opcionales de rutas

- Los endpoints `POST /routes` y `PUT /routes/{route_id}` aceptan el campo opcional `images`, una lista de URLs (por ejemplo, tras subir el fichero a un CDN). No se usa `multipart/form-data`; se envían y reciben como JSON.
- Cada elemento de `images` debe ser un string no vacío. Se admiten hasta 10 URLs por ruta. Si no se envía el campo, el backend lo normaliza a `[]`.
- Las respuestas de rutas incluyen siempre `images` (lista vacía cuando no hay imágenes), manteniendo compatibilidad con rutas existentes.

### Prerequisits

En el dir rexa2-app:
pip install -r requirements 
