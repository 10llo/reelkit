# Brand "Consultorio Pop" para Dogtora Dani — design spec

Fecha: 2026-10-07 · Estado: para revisión

## 1. Objetivo

Hoy los videos se ven genéricos. Este spec les da una identidad propia de **Dogtora Dani**: cercana y juguetona, con stickers, squash & stretch, cambios de fondo entre escenas y efectos de sonido sutiles. También incluye los **iconos de redes sociales** en el cierre.

Por ahora la brand es para Dani. Después se generalizará a otros talentos, así que todo el estilo vive en una capa de tokens y piezas compartidas: para volverlo genérico se cambian los tokens, no los bloques.

**Éxito:**
- Los 20 bloques, el marco y el cierre usan la brand.
- Los ejemplos `dani-chocolate`, `dani-fiebre` y `smoke` pasan `npm test`, `npm run lint`, `npm run check` (9x16 y 4x5) y `npm run check:gallery`.
- Un render de `dani-chocolate` suena con SFX sutiles y sincronizados con su animación.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Alcance de la brand | Solo Dani por ahora. El look anterior (noche morada con huellas) se **reemplaza**, no convive con el nuevo |
| Personalidad | Cercana y juguetona → dirección **A · Consultorio Pop** |
| Arquitectura | Capa `src/brand/` (tokens + piezas). Los bloques se reescriben sobre ella |
| Transición entre escenas | **Huella gigante** que crece desde una esquina superior |
| SFX | **Sintetizados por código**, **sutiles** (unos 15 dB bajo la voz) y colocados dentro de cada bloque |
| Redes en el cierre | **Lista** de stickers icono + handle, iconos en **colores oficiales** |
| Mastering de audio | Fuera de este spec: tiene su propio ciclo. Los SFX quedan listos para mezclarse con la voz masterizada |

## 3. Sistema visual

### Paleta (perfil de Dani)

`talent.colors` de Dani en `examples/dani-*/talent.json`:

| token | valor | uso |
|---|---|---|
| `bg` | `#FFF4E6` crema | fondo base / hook |
| `bg2` | `#FFE0D6` durazno | fondo secundario |
| `text` | `#2B1B3D` tinta | texto, bordes, sombras |
| `accent` | `#FF6B57` coral | acentos, progreso, pastilla del nombre |
| `danger` | `#E5484D` | malo / peligro |
| `safe` | `#2FBF71` | bueno / correcto |
| `extra.teal` | `#2EC4B6` | acento secundario |
| `extra.sun` | `#FFC93C` | resaltado (palabra activa, brillos) |
| `extra.choco*` | se conservan | episodio de chocolate |

**Fondos por escena** (tokens de brand, pastel para que el texto tinta y los stickers blancos siempre se lean):

| hook | paso 1 | paso 2 | paso 3 | cierre |
|---|---|---|---|---|
| `#FFF4E6` crema | `#FFE0D6` durazno | `#D3F2EE` menta | `#FFF0C2` mantequilla | `#FF6B57` coral |

En el cierre, sobre coral, los títulos van en blanco con contorno o sombra tinta, y los stickers siguen blancos con texto tinta.

El perfil real de Dani (`~/reelkit-studio/talents/dani.json`) no está en el repo. Las notas de la versión dirán qué colores copiar. `/reelkit:setup --update` no toca talentos.

### Tipografía

- Títulos: **Fredoka 700**. Cuerpo, subtítulos y datos: **Nunito 900/800**.
- Se empaquetan con `@fontsource/fredoka` y `@fontsource/nunito` (subsets latin y latin-ext), igual que hoy Baloo 2 e Inter, que se eliminan.
- `src/frame/theme.ts` mantiene su API (`FONT_HEAD`, `FONT_BODY`, `headStyle`, `bodyStyle`, `useFontsReady`) y solo cambian las familias y los pesos. Así `fitFontSize` y `minFont` siguen funcionando sin cambios.

### Sticker

La pieza visual base es `<Sticker>`:
- fondo blanco (o `tone`: `danger`, `safe`, `accent`, `ink`);
- borde 6 px tinta, sombra dura 10 px abajo a la derecha (sin blur), radio 36 px;
- giro por defecto −3° (prop `tilt`).

Las medidas son a 1080 px de ancho.

### Movimientos (`src/brand/motion.ts`)

Funciones puras `(frame, fps, at) → estilo`. Todas son springs de Remotion; no usan CSS animations, porque el render es por frame.

| preset | qué hace | SFX asociado |
|---|---|---|
| `slap` | escala 0 → aplastado (1.2, 0.8) → estirado → 1, con giro | `pop` |
| `drop` | cae desde arriba, se aplasta al tocar y rebota una vez | `boing` |
| `wiggle` | sacudida de rotación ±9° que se amortigua | `bonk` |
| `popIn` | escala 0 → 1.15 → 1 | `chime` |
| `jelly` | pulso elástico de escala (aterrizaje de un número) | `ding` |

Los helpers actuales `enter`, `pop` y `pulse` de `frame/timing.ts` se mantienen para los movimientos secundarios.

### Marco

- **StepTracker**: píldoras con borde tinta que se llenan de coral.
- **Captions**: sticker blanco con borde tinta. La palabra que suena lleva fondo `sun`. Tamaño mínimo de 40 px, como hoy.
- **TalentSlot**: borde tinta con sombra dura. `pillName` va en una pastilla coral con texto blanco y giro −4°.
- **Disclaimer**: tinta al 60 %, sin caja.
- **Background**: color plano de la escena, con el patrón de huellas actual más grande y en tinta al 4 %. Se conserva la máscara del espacio del talento.

## 4. Transición entre escenas: huella gigante

- `src/brand/SceneFlood.tsx` se dibuja dentro de `Background`, debajo del contenido.
- En cada corte (hook → paso 1 → paso 2 → paso 3 → cierre), la `PawShape` existente se pinta con el color de la escena siguiente:
  - arranca **6 frames antes** del corte;
  - crece durante **14 frames** (ease-out cúbico) desde una esquina superior, alternando izquierda y derecha y nunca desde el espacio del talento;
  - gira de −15° a 0° hasta cubrir el lienzo.
- Al terminar, el fondo base queda con el color nuevo.
- El fade-out actual de 8 frames de cada escena se mantiene, así que el contenido viejo se va mientras crece la huella.
- Cada corte suena con `whoosh`.
- La función que calcula el color de fondo en un frame dado es pura, para poder testearla: color por escena, progreso de la huella y origen.
- El layout 4x5 usa la misma lógica: el tamaño final de la huella sale del lienzo.

## 5. Efectos de sonido

### Sonidos

`scripts/sfx/synth.ts` (`npm run sfx:build`) genera 7 WAV mono a 48 kHz en `src/brand/sfx/`. Los WAV se versionan en el repo y se importan como módulos (se agrega `*.wav` a `src/assets.d.ts`). El render no depende de `public/` ni de internet.

| nombre | síntesis | duración |
|---|---|---|
| `whoosh` | ruido filtrado con barrido de grave a agudo | 0,4 s |
| `pop` | seno con caída rápida de tono | 60 ms |
| `boing` | seno con vibrato y tono descendente | 0,3 s |
| `ding` | campana (parciales inarmónicos con decaimiento) | 0,5 s |
| `chime` | dos notas ascendentes de campana | 0,45 s |
| `bonk` | golpe grave filtrado, apagado | 0,2 s |
| `tick` | clic corto | 25 ms |

La síntesis es **determinista**: el ruido sale de un PRNG con semilla fija, así que el mismo código produce los mismos bytes. Todos los archivos se normalizan a pico de −3 dBFS.

### Uso

- `<Sfx name at />` en `src/brand/Sfx.tsx` es un `<Sequence from={at}>` con `<Audio>` de `@remotion/media`.
- No renderiza nada si `checkMode` está activo o si `episode.sfx === false`. Lo lee de un `SfxContext` que provee `EpisodeVideo`.
- Cada bloque exporta una función pura `cues(props, timing): Cue[]` (`{ name, at }` en frames del beat) que usa los mismos keyframes que su animación. El bloque renderiza `<SfxCues cues={cues(props, timing)} />`. Así sonido e imagen comparten la fuente de verdad y los cues se pueden testear sin renderizar.
- **Ganancias**: una sola tabla en `src/brand/sfx-mix.ts` con un nivel maestro y la ganancia relativa de cada sonido. `tick` va unos 6 dB por debajo del resto. El valor inicial deja los SFX unos 15 dB bajo la voz.
- **Antirrepetición**: `SfxCues` fusiona los cues del mismo sonido a menos de 4 frames dentro de un beat (función pura `mergeCues`). Entre beats o escenas no hace falta: las transiciones duran al menos 12 frames.

### Esquema

En `episode.json` se agrega `"sfx": boolean` (por defecto `true`). El validador y el catálogo lo documentan.

## 6. Bloques

Los 20 bloques se reescriben sobre `<Sticker>`, los presets y `<Sfx>`. No cambian sus schemas (props), salvo que algo del rediseño lo exija; en ese caso, el cambio y sus ejemplos se documentan en el spec del bloque.

| bloque | movimiento clave | cues |
|---|---|---|
| Hook | título en sticker con `slap` | `pop` |
| BigStat | número `jelly` al terminar el conteo | `ding` |
| Checklist | cada check `popIn` | `chime` por check |
| Chips | chips en mini `slap` escalonado | `tick` por chip |
| Close | ver §7 | `boing` por red |
| Compare | dos stickers que entran con `slap` | `pop` ×2 |
| Cycle | nodos con `popIn` en orden | `tick` por nodo |
| Decision | pregunta `slap`; rama mala `wiggle`, buena `popIn` | `pop`, `bonk`, `chime` |
| Definition | término en sticker `slap` | `pop` |
| DoDont | No: `wiggle`. Sí: `popIn` | `bonk`, `chime` |
| Gauge | la aguja aterriza con `jelly` | `ding`; `bonk` si cae en zona de peligro |
| MythFact | Mito: `wiggle` + tachado. Dato: `popIn` | `bonk`, `chime` |
| Process | pasos con `drop` escalonado | `tick` por paso |
| Proportion | la proporción aterriza con `jelly` | `ding` |
| Quantity | barras crecen y la última aterriza con `jelly` | `ding` |
| Timeline | hitos con `popIn` | `tick` por hito |
| Timer | el reloj avanza y aterriza con `jelly` | `tick` al arrancar, `ding` al final |
| Trend | la línea se dibuja y el punto final hace `jelly` | `ding` |
| Versus | dos stickers chocan desde los lados | `pop` ×2 |
| Anatomy | etiquetas con `popIn` | `tick` por etiqueta |

`SceneRenderer`: el título de la escena pasa a ser un sticker con `slap` + `pop`. La transición entre dos beats se mantiene.

## 7. Cierre con redes sociales

- Título y línea de acento en blanco con sombra tinta sobre coral. `accentText` va en `sun`.
- Nombre y profesión en tinta.
- Las redes van en una **lista vertical de stickers**: icono a color + handle. Solo aparecen las que tengan valor en `talent.handles`, en el orden Instagram, TikTok, WhatsApp, Facebook. WhatsApp muestra el número tal como está en el perfil.
- Cada sticker entra con `drop`, escalonado `STAGGER`, y suena con `boing`.
- Los iconos son SVG propios en `src/icons/sets/social.tsx`: `instagram`, `tiktok`, `whatsapp`, `facebook`. Usan los colores oficiales (`#D62976`, `#111111`, `#25D366`, `#1877F2`) por defecto y aceptan `color` para override.
- Se registran en `ICONS`, así aparecen en `IconSheet` y en el catálogo.
- `teaser` y `actions` se mantienen, con estilo sticker.
- El final sigue estático, para que el loop sea limpio.

## 8. Errores y bordes

- **Sin handles**: el bloque de redes no se renderiza y el cierre se recentra.
- **Handle largo**: se aplica `fitFontSize` hasta el mínimo de 40 px. Si no cabe, `npm run check` lo marca como hoy.
- **Escena muy corta**: con `MIN_SCENE_FRAMES = 30`, la huella siempre cabe (6 + 14 frames).
- **`sfx: false`**: cero `<Audio>` de SFX, y la música y el clip no cambian.
- **Fuentes que no cargan**: mismo comportamiento que hoy (`useFontsReady` reporta el error y renderiza).

## 9. Pruebas

- `tests/brand/synth.test.ts`: cada sonido cumple su duración (±5 ms), el pico es ≤ −3 dBFS, no hay muestras fuera de [−1, 1] y la salida es determinista (hash igual en dos corridas).
- `tests/brand/flood.test.ts`: color de fondo y progreso de la huella en frames clave alrededor de cada corte, para 9x16 y 4x5.
- `tests/brand/sfx.test.ts`: `mergeCues` fusiona cues cercanos, y no hay audio en `checkMode` ni con `sfx: false`.
- `tests/icons.test.ts` (existente): se amplía con los 4 iconos sociales.
- `tests/blocks/*.schema.test.ts` (existentes) siguen verdes. `tests/brand/cues.test.ts` llama a `cues()` de cada bloque con las props de los ejemplos y de la galería, y verifica que todos caen dentro de su beat.
- `npm run check` y `npm run check:gallery` en verde para los tres ejemplos, en ambos layouts.
- Revisión visual: `npm run dev` y render de `dani-chocolate`, con tu aprobación antes de cerrar.

## 10. Fuera de alcance

- Mastering de la voz (EQ, compresión, loudness, silencios): spec aparte.
- Temas múltiples o brand por talento (generalización).
- Ducking de la música (va con el mastering).
- Cambios en los comandos del plugin, salvo documentar `sfx` en el catálogo y en los skills de autoría.
