# Análisis de estilo de creadores (`/reelkit:style`) — design spec

Fecha: 2026-10-07 · Estado: para revisión · Rama: `feat/style-analysis` (sobre `feat/dani-pop-brand`)

## 1. Objetivo

El usuario pasa cuentas de TikTok o Instagram de creadores de referencia y, opcionalmente, la cuenta propia del talento. reelkit descarga sus videos públicos recientes, mide su estilo y entrega un reporte con propuestas concretas para reelkit: ajustes de estilo, bloques nuevos y formatos de guion. Con eso el usuario decide qué componentes o estilos crear.

**Éxito:**
- Con 2–5 cuentas reales, `/reelkit:style` produce `report.md`, una hoja de fotogramas y una de gancho por video, `metrics.json` por video y `accounts.json`.
- Cada número del reporte sale de `metrics.json`.
- Cada propuesta cita videos concretos con link.
- `npm test`, `npm run lint` y los tests del plugin pasan.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Cuentas | Referencias siempre (1–5) + la propia del talento si existe (opcional) |
| Obtención de videos | Descarga con `yt-dlp` (dependencia externa, instalada por el usuario) |
| Entregable | Reporte + propuestas concretas; **no toca código** |
| Arquitectura | Mediciones en código (CLI del studio, testeadas) y criterio de diseño de Claude (skill) |
| Volumen por defecto | 5 videos más recientes por cuenta |

## 3. Flujo

`/reelkit:style <@cuenta|URL> [más…] [--own=@cuenta] [--videos=N]`

1. **Workspace.** Igual que los demás comandos: `scripts/workspace.mjs`, aviso si el template está desactualizado y todo con `cd "<ws>"`.
2. **Entradas.**
   - Cada cuenta se acepta como handle (`@x`, que pregunta la red si es ambiguo) o como URL de perfil de `tiktok.com/@x` o `instagram.com/x`. Máximo 5 referencias.
   - **Cuenta propia:** `--own`, o la que esté en `talents/<id>.json` → `handles`, con confirmación del usuario. Si no hay, se omite.
   - **Carpeta:** `styles/<yyyy-mm-dd>-<slug>/`. El slug se pregunta, por defecto `referencias`.
3. **`yt-dlp`.** Si falta, se para y muestra cómo instalarlo: `brew install yt-dlp` en macOS, `pip install yt-dlp` en Windows o Linux.
4. **Fetch.** Corre `npm run reelkit -- style fetch <dir> <cuenta…> [--own=…] [--videos=5] [--cookies-from-browser=chrome]`.
   - Para cada cuenta lista los N videos más recientes. Descarga cada video en mp4 de un solo archivo (`-f "b[ext=mp4]/b"`, sin necesidad de ffmpeg) y guarda su `info.json`.
   - **Instagram con sesión.** Si `yt-dlp` falla por login, el comando sale con un código específico. El comando del plugin entonces **pregunta** si puede usar las cookies de Chrome (`--cookies-from-browser=chrome`) y reintenta solo esa cuenta. Nunca lo hace sin permiso y nunca pide contraseñas.
   - **Idempotente:** los videos que ya tienen `video.mp4` e `info.json` no se vuelven a descargar.
   - **Errores por cuenta:** privada, inexistente, límite de descargas o red. Se registran en `accounts.json` con su motivo y las demás cuentas siguen.
5. **Analyze.** Corre `npm run reelkit -- style analyze <dir>`: calcula las métricas, dibuja las hojas y escribe `accounts.json` con las medianas por cuenta (§4).
6. **Reporte.** Claude sigue el skill `reelkit:style-analysis`: lee `accounts.json`, los `metrics.json` y **mira** `sheet.png` y `hook.png`. Luego escribe `report.md` (§5).
7. **Cierre.** Un resumen de 5 líneas con las propuestas principales, y dos ofertas:
   - borrar los `video.mp4` descargados, dejando reporte, hojas y métricas;
   - pasar una propuesta a diseño con brainstorming, spec y plan.

### Estructura en disco

```
styles/<yyyy-mm-dd>-<slug>/
  report.md
  accounts.json                 # cuentas, perfil, medianas, fallos
  <red>-<cuenta>/<video-id>/
    video.mp4                   # temporal (ignorado por *.mp4 en .gitignore del studio)
    info.json                   # salida de yt-dlp (recortada a los campos usados)
    metrics.json
    sheet.png                   # 12 fotogramas 4×3 con timestamp
    hook.png                    # 0–3 s cada 0,5 s (6 fotogramas)
```

### Uso responsable

- Solo videos públicos, o los que el usuario ve con su propia sesión, y solo para análisis.
- Nada descargado se reutiliza en episodios. El reporte cita cada video por su URL.
- Las propuestas toman patrones, no copian diseño, logos ni contenido de otro creador.

## 4. Mediciones (`style analyze`)

Todo corre en Node con dependencias que el template ya tiene: `mediabunny` y `@mediabunny/server` para decodificar, el transcriptor Whisper existente de `scripts/lib/transcribe.ts` y `pngjs`. No usa el `ffmpeg` de Remotion, porque es un build mínimo sin filtros de escena.

Si el video dura más de 180 s, solo se analizan los primeros 180 s y se marca `truncated: true`.

### `metrics.json`

| Campo | Contenido | Método |
|---|---|---|
| `durationSec`, `width`, `height`, `fps` | básicos | metadatos |
| `cuts` (s), `cutsPerMinute`, `avgShotSec`, `firstCutSec` | ritmo | fotogramas a 10 fps reducidos a 64 px de ancho en gris. Hay corte cuando la diferencia absoluta media entre fotogramas consecutivos supera `CUT_THRESHOLD` y es un pico local. Se ignoran cortes a menos de 0,3 s del anterior |
| `speech.wordsPerMinute`, `speech.firstWordSec`, `speech.hookText` (palabras que empiezan antes de 3 s), `speech.coverage` (fracción del tiempo con palabra activa) | voz | Whisper `large-v3-turbo`, con el mismo flujo de descarga y modelo que el sync. Si no hay palabras o no hay Whisper, todo es `null` y se agrega `speech.unavailable` con el motivo |
| `audio.speechDb`, `audio.gapDb`, `audio.peakDb` | niveles | RMS en dBFS sobre mono 16 kHz, separando los tramos con palabra de los tramos sin palabra. Si `gapDb` está cerca de `speechDb`, hay música o fondo constante |
| `palette` (5 × `{hex, share}`), `brightness`, `saturation` | color | 24 fotogramas muestreados uniformemente, reducidos a 64 px, cuantizados en un cubo RGB de 4 bits por canal; se toman los 5 bins más frecuentes. Brillo y saturación promedio en HSV (0–1) |
| `post` | `url`, `caption`, `hashtags`, `views`, `likes`, `comments`, `uploadDate` | desde `info.json`; un campo ausente queda en `null` |
| `truncated` | boolean | — |

### Imágenes

- **`sheet.png`:** 12 fotogramas uniformes de 270 px de ancho, en una grilla 4×3, con el segundo dibujado en una franja negra. Los dígitos se dibujan con una fuente bitmap mínima en código, sin depender de fuentes del sistema.
- **`hook.png`:** fotogramas en 0; 0,5; 1; 1,5; 2 y 2,5 s, en una fila de 6.

### `accounts.json`

```json
{
  "createdAt": "…",
  "accounts": [
    {
      "id": "tiktok-dogtora.dani",
      "network": "tiktok",
      "handle": "dogtora.dani",
      "own": true,
      "status": "ok" | "failed",
      "reason": null,
      "profile": { "url": "…", "followers": null },
      "videos": ["<video-id>", …],
      "median": {
        "durationSec": 0,
        "cutsPerMinute": 0,
        "wordsPerMinute": 0,
        "firstWordSec": 0,
        "gapDb": 0,
        "brightness": 0,
        "saturation": 0
      }
    }
  ]
}
```

Las medianas ignoran los `null`. Si todos los valores son `null`, la mediana es `null`.

## 5. Reporte (`report.md`, idioma del talento)

Secciones, en este orden:

1. Encabezado: cuentas analizadas, videos por cuenta y fallos con su motivo.
2. Resumen en 5 líneas.
3. Tabla comparativa por cuenta (medianas de `accounts.json`): duración, cortes/min, palabras/min, primera palabra, fondo bajo la voz (`gapDb`) y paleta.
4. Por cuenta, con una frase de carácter:
   - gancho, con `hook.png` enlazado;
   - ritmo;
   - encuadre y cámara;
   - tipografía y subtítulos;
   - gráficos y stickers;
   - color;
   - sonido;
   - el video con más vistas y por qué creemos que funcionó.
5. Patrones comunes · Huecos (lo que nadie hace).
6. Cuenta propia vs referencias, solo si hay cuenta propia. Se compara sin juzgar.
7. **Propuestas para reelkit**, ordenadas por impacto y esfuerzo. Cada una tiene:
   - **tipo:**
     - `estilo`: cambio concreto en `src/brand/`, con el valor actual y el propuesto;
     - `bloque`: nombre, propósito, props al estilo del catálogo, animación y cue de sonido;
     - `guion`: regla para `script-writing`;
   - **evidencia:** cuentas y videos con link, más la hoja de fotogramas;
   - **impacto** y **esfuerzo:** alto, medio o bajo;
   - **choque con la brand:** si contradice Consultorio Pop, lo dice.

**Reglas:**
- Todo número sale de los JSON.
- Lo que se interpreta de las imágenes va como observación ("se ve…"), separado de las mediciones.
- No se proponen copias.

## 6. Piezas del plugin

| Archivo | Cambio |
|---|---|
| `commands/style.md` | nuevo comando (§3) |
| `skills/style-analysis/SKILL.md` | método de lectura, plantilla del reporte, formato de propuestas y reglas (§5) |
| `template/scripts/commands/style.ts` | subcomandos `fetch` y `analyze`, registrados en `scripts/reelkit.ts` |
| `template/scripts/lib/style/` | `ytdlp.ts` (argumentos, parseo de salida y clasificación de errores), `frames.ts` (decodificación y muestreo con mediabunny), `cuts.ts`, `palette.ts`, `speech.ts`, `audio-levels.ts`, `sheet.ts` (composición PNG y dígitos bitmap), `accounts.ts` (medianas y escritura) |
| `scripts/doctor.mjs` | chequeo de `yt-dlp` como **aviso** (no falla el setup) |
| `scripts/tests/plugin-content.test.mjs` | `style` en la lista de comandos de la CLI |
| `README.md` | fila de `/reelkit:style` en la tabla del flujo y nota sobre `yt-dlp` |
| Versión | 0.6.0 en `template/package.json` (y lockfile), `.claude-plugin/plugin.json` y `marketplace.json` |

## 7. Errores

| Caso | Comportamiento |
|---|---|
| `yt-dlp` ausente | `style fetch` sale con código 2 y un mensaje de instalación; el comando se detiene |
| Login requerido (Instagram) | código de salida 3 y la cuenta queda marcada `needs-login`; el comando pregunta por las cookies y reintenta |
| Cuenta privada, inexistente, rate limit o red | la cuenta queda `failed` con su motivo y las demás siguen |
| Ninguna cuenta OK | no se escribe reporte; se explica el motivo |
| Video sin audio o sin voz | métricas de voz en `null` con motivo |
| Whisper no disponible | métricas de voz en `null`; el resto se calcula |
| Video > 180 s | se analizan 180 s y queda `truncated: true` |
| Re-ejecución | `fetch` salta lo descargado y `analyze` recalcula siempre |

## 8. Pruebas

- **Puras:**
  - `cuts`: secuencias sintéticas con cortes conocidos, fundidos que no deben contar y el mínimo de 0,3 s.
  - `palette`: imagen con proporciones de color conocidas.
  - `speech`: palabras por minuto, `hookText`, `coverage`, `firstWordSec` y los casos `null`.
  - `audio-levels`: dB con y sin palabras sobre señales sintéticas.
  - `accounts`: medianas con `null`.
  - `ytdlp`: construcción de argumentos y clasificación de errores a partir de stderr de ejemplo (login, privada, 404, 429).
  - `sheet`: dimensiones de la grilla y dígitos presentes.
- **Integración:** un mp4 corto de 1 s rojo + 1 s azul con un tono de audio, que `analyze` procesa, y que detecta 1 corte cerca de 1,0 s, paleta roja y azul, y voz `null`. Se genera en el test con mediabunny si puede codificar en Node; si no, se genera una vez con un script y se versiona como fixture (≤ 100 KB).
- **Sin red:** `yt-dlp` se simula, y ningún test lo llama de verdad.
- **Plugin:** `plugin-content` valida comando, skill y CLI.

## 9. Fuera de alcance

- Implementar las propuestas, que siguen su propio ciclo.
- YouTube Shorts.
- OCR de texto en pantalla y detección de caras por código.
- Análisis de comentarios.
- Subagentes en paralelo por cuenta (enfoque C, posible mejora futura).
