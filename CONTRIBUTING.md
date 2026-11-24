# Contribuir

Se agradecen los informes de errores y las pull requests acotadas. Para cambios importantes, abre primero una incidencia para acordar el alcance.

## Desarrollo

- Usa Node.js 22.12 o posterior.
- Instala las dependencias con `npm ci`.
- Ejecuta `npm test` y `npm run build` antes de enviar una pull request.
- Añade o actualiza pruebas específicas para el comportamiento que cambies.

## Seguridad y alcance

- No incluyas claves de API, códigos de acceso, datos de clientes, `.env` ni archivos de parámetros de despliegue.
- Usa datos sintéticos en los ejemplos e identifícalos claramente.
- No añadas logotipos de clientes o partners sin permiso.
- Guarda las credenciales en variables del servidor o en un gestor de secretos; no las expongas mediante Vite ni código del navegador.

Al enviar una contribución, aceptas que se distribuya bajo la licencia MIT del repositorio.
