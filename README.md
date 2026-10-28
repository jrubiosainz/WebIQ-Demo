# Demo de Microsoft Web IQ

Demo interactiva para enseñar cinco tareas empresariales que requieren combinar búsqueda vertical, evidencia reciente y lectura directa de páginas. Cada caso reproduce una ejecución guionizada con datos ficticios y permite comparar el flujo de Web IQ con una alternativa de Grounding with Bing Search. Incluye interfaz en español e inglés, perfiles de cliente, temas y marca personalizables.

> **English summary:** An interactive, bilingual Microsoft Web IQ demo with five enterprise scenarios, scripted Web IQ vs. Bing Grounding comparisons, and configurable client branding. The scripted evidence is fictional; live API access is optional.

## Casos de uso

| Caso | Sector de referencia | Diferencia que enseña |
|---|---|---|
| Vigilancia regulatoria | Seguros / sector público | Buscar en el dominio oficial, contrastar prensa en varios idiomas y leer la guía completa para extraer obligaciones y fechas. |
| Precios de la competencia | Energía / distribución | Comparar tarifas consultando directamente las páginas actuales, en vez de depender solo de una copia indexada. |
| Crisis de reputación | Consumo / turismo | Cruzar noticias, web y vídeo en varios mercados, con fechas y señales para orientar la respuesta. |
| Due diligence de terceros | Compras / riesgo | Reunir registros oficiales, sanciones, prensa y la web del proveedor en una vista con fuentes trazables. |
| Asistente del viajero | Viajes / atención al cliente | Combinar hora y tiempo estructurados con avisos locales, páginas, imágenes y momentos relevantes de vídeo. |

La demo no pretende que Grounding with Bing Search sea incapaz de participar en estos flujos: muestra dónde una llamada de grounding genérica puede requerir búsquedas adicionales, servicios externos o código propio para cubrir lectura de páginas, vídeo, imágenes y datos estructurados.

## Requisitos y ejecución

- Node.js 22 o superior.
- No hace falta una clave para recorrer la reproducción guionizada.

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. La reproducción, la comparativa, el coste ilustrativo y los ejemplos de API funcionan sin llamar a servicios externos.

### Modo en vivo (opcional)

El servidor local hace de proxy: la clave permanece en el servidor y no se envía al navegador. Copia `.env.example` a `.env` y añade una clave autorizada para Web IQ:

```bash
cp .env.example .env
# Edita .env y define WEBIQ_API_KEY
```

Arranca el proxy en otra terminal mientras Vite sigue activo:

```bash
npm run live
```

El proxy escucha por defecto en `127.0.0.1:8787`; Vite reenvía `/api` a ese servidor. La pestaña **En vivo / Live** indica si está disponible. `npm run start` compila y sirve la demo y el proxy desde un único proceso. Para no exponer la clave, no publiques `.env`, no la introduzcas en el navegador y no configures el proxy para escuchar en una red compartida sin revisar antes el acceso.

## Idioma y personalización

- Cambia entre **ES** y **EN** desde la cabecera; la selección se guarda en el navegador.
- En **Ajustes → Cliente**, selecciona Iberdrola, Barceló, W2M, SegurCaixa Adeslas, Comunidad de Madrid u otro cliente. Puedes aplicar automáticamente sus colores aproximados, ocultar los demás clientes y resaltar los casos recomendados.
- En **Ajustes → Apariencia**, elige uno de los cuatro temas o edita colores de fondo, panel, cabecera y acento. También puedes cambiar tipografías, tamaño y esquinas.
- En **Ajustes → Logos**, sube un SVG, PNG o WebP; el archivo se guarda solo en el almacenamiento local del navegador. Para incluir un logo al servir la demo, consulta [`public/logos/README.md`](public/logos/README.md). Usa marcas y logotipos solo con autorización.
- La mayoría de las opciones se recuerdan en `localStorage` del navegador. No se exportan al servidor.

## Enlaces y recorridos

La demo admite enlaces profundos para preparar una presentación, por ejemplo:

```text
?scenario=3&variant=bing&lang=en
?scenario=regulatory-watch&t=end&client=barcelo&theme=dark
?view=why
?view=guide&settings=open
```

`scenario` acepta el número del caso (1–5) o su identificador; `variant` puede ser `webiq` o `bing`; `t=end` salta al resultado. Los parámetros no reconocidos se ignoran.

## Datos, API y precios

- Las fuentes, consultas, latencias y respuestas de la reproducción son **ficticias** y solo ilustran el flujo; no son resultados reales ni consejo regulatorio, financiero o de viaje. Se señalan en pantalla.
- Las respuestas de la demo muestran fragmentos limitados a 200 caracteres por fuente. Respeta las condiciones vigentes de Web IQ al reutilizar resultados.
- Los ejemplos de API son didácticos. El modo en vivo envía solicitudes reales a Web IQ cuando se configura una clave válida.
- La tabla de coste usa precios públicos consultados el **28 de octubre de 2026**: Web IQ, 7 USD por 1.000 solicitudes de búsqueda (1 USD por 1.000 lecturas con `browse`); `/auto` figura a 0 USD durante la beta; Grounding with Bing Search se modela a 14 USD por 1.000 transacciones. El modo de comparación y los volúmenes son supuestos editables, no una cotización. Comprueba los precios y términos vigentes antes de hacer una propuesta.

## Desarrollo y comprobaciones

```bash
npm test
npm run build
```

La CI ejecuta pruebas de datos, lógica y proxy con un upstream simulado; no requiere una clave ni llama a la API real.
