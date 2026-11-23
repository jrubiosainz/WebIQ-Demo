# Política de seguridad

## Versiones con soporte

Solo tiene soporte la última versión de la rama predeterminada.

## Cómo informar de una vulnerabilidad

Informa de las vulnerabilidades mediante la función privada de GitHub (**Security → Report a vulnerability**) cuando esté habilitada. No incluyas credenciales, claves de API, códigos de acceso ni detalles explotables en incidencias públicas.

Si no está disponible, contacta en privado con la persona propietaria del repositorio mediante un canal enlazado desde su perfil de GitHub. Incluye una descripción breve, el impacto y pasos de reproducción; deja tiempo para corregirlo antes de divulgarlo públicamente.

## Gestión de credenciales

Mantén las credenciales de Web IQ, el modelo y Azure en el servidor o en un gestor de secretos. Usa un código de acceso único para las demos en vivo, rota cualquier credencial que pueda haberse expuesto y no hagas commit de `.env` ni de archivos de parámetros de despliegue.
