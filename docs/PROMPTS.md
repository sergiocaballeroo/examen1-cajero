# Prompts usados para generar la aplicación

Examen 1. Interfaz gráfica para un cajero automático.
Sergio Jair Caballero Martínez. 2026-11-20.

## Herramienta y forma de trabajo

La aplicación se generó con **Claude Code** (Anthropic), modelo Claude Fable 5.1, desde la terminal de Windows 11, en una sola sesión el 2026-11-20. Claude Code es un asistente que trabaja directamente sobre la carpeta del proyecto: crea y edita archivos, ejecuta pruebas, hace commits y publica en GitHub.

El método fue conversacional: yo planteé el problema y las decisiones de alto nivel, y el asistente propuso, construyó y probó. Cuando algo no me convencía (la redacción de la justificación, el diseño visual) lo pedí en un nuevo prompt. Los prompts se transcriben con la ortografía corregida pero sin cambiar su contenido.

## Resumen

| # | Prompt (resumen) | Qué produjo |
|---|---|---|
| 1 | Enunciado del examen, con foto del pizarrón | Contexto recuperado y cuatro preguntas de orientación |
| 2 | Respuestas a las preguntas de orientación | Toda la aplicación, las pruebas, la documentación y la publicación |
| 3 | "La justificación ni yo la entiendo" | Justificación reescrita en lenguaje llano |
| 4 | "Ábrelo por favor" | Sitio abierto en el navegador |
| 5 | Diseño sobrio, elegante y creíble como banco | Rediseño visual con paleta, marca y tipografía |
| 6 | "Esto no parece la interfaz de un banco" | Cajero clásico: pantalla con botones físicos laterales, teclado y ranuras |
| 7 | "No se ve la pantalla completa", con captura | La carcasa se escala para caber entera en la ventana |
| 8 | "Bien la lógica, ¿puedes agregarle animaciones?" | Animaciones físicas: tarjeta, billetes, comprobante, transiciones |

## Prompt 1: planteamiento del examen

> ¿Recuerdas que me habías ayudado a llenar un tema de mi examen 1, que consistía en hacer una página web con esas características? ¿Me ayudarías con esto para hacer hoy el entregable?

Adjunté la fotografía del pizarrón con el enunciado:

> **Examen 1.** Diseñar e implementar una interfaz gráfica para un cajero automático. Deberá implementar las siguientes funciones:
> a) Ingreso al sistema (NIP: 8420)
> b) Consulta de saldo
> c) Retiro de efectivo
> d) Depósito a otra cuenta
> \* Justificar cada una de las decisiones tomadas para el diseño e implementación.
> \* Incluir los prompts usados para generar la aplicación.

**Qué produjo.** El asistente recuperó el contexto de la tarea anterior de la materia (repositorio `tarea2-ia-ui`, hecho en Angular, con reporte y carátula) y, antes de escribir código, me planteó cuatro preguntas: tecnología, entregables, datos simulados y fecha de entrega.

## Prompt 2: decisiones de orientación

Respondí las cuatro preguntas así:

| Pregunta del asistente | Mi respuesta |
|---|---|
| ¿Con qué tecnología hacemos la interfaz? (Angular 21 + Material, o HTML, CSS y JS puro) | Lo que sea mejor para hacer el entregable, aunque igualmente considero que sería buena idea GitHub Pages y el entregable para ejecutar, ¿no? O no sé cómo lo pida el examen 1. |
| ¿Qué entregables generamos hoy? (repo público + GitHub Pages, reporte Word/PDF, pruebas E2E) | Repo público + GitHub Pages, justo repo público. |
| ¿Qué datos simulados usamos? NIP 8420 es fijo por el examen. | Establece reglas como si fuera un banco real. |
| ¿Cuál es la fecha de entrega para la carátula? | Hoy, 2026-11-20. |

**Qué produjo.** Con estas respuestas el asistente tomó las decisiones que se explican en `JUSTIFICACION.md` y generó, en este orden:

1. `js/validaciones.js`: dígito verificador de CLABE, catálogo de bancos, algoritmo de Luhn y formato de moneda. Antes calculó con Node números de cuenta de prueba con dígito verificador correcto.
2. `js/banco.js`: reglas (NIP 8420, tres intentos, múltiplos de 100, límites por operación y por día, depósito hasta 20,000), cuenta simulada y persistencia en localStorage.
3. `js/app.js`: máquina de estados con catorce pantallas, teclado en pantalla y físico, confirmación, comprobante y cierre por inactividad.
4. `index.html` y `css/estilos.css`: estructura de cajero y estilos responsivos.
5. `scripts/pruebas.mjs`: 32 pruebas con Playwright que además generan las capturas.
6. `README.md`, `docs/JUSTIFICACION.md` y este archivo.
7. Repositorio público en GitHub y publicación en GitHub Pages.

**Iteraciones sin prompt.** Las primeras correcciones no las pedí yo: salieron de las pruebas automáticas que el asistente ejecutó por su cuenta.

- Corrida 1: falló la primera prueba. El aviso de inactividad tenía `display: grid` y eso anulaba el atributo `hidden`, así que una capa invisible tapaba toda la pantalla y bloqueaba los clics. Se corrigió con `.modal[hidden] { display: none; }`.
- Corrida 2: falló la prueba 24 por culpa del propio script, que intentaba hacer clic en una cuenta de prueba dentro de un desplegable cerrado. Se corrigió la prueba, no la app.
- Corrida 3: 32 de 32 pruebas pasaron.

## Prompt 3: la justificación en lenguaje llano

> Espera, la justificación ni yo la entiendo. ¿Heurísticas de Nielsen y metáfora de kiosco? ¿De dónde sacas todo eso?

**Qué produjo.** La primera versión de `JUSTIFICACION.md` citaba heurísticas de Nielsen, la ley de Fitts y criterios WCAG. Se reescribió completa en primera persona y en lenguaje cotidiano: para cada decisión, qué hice y por qué, sin teoría, de modo que yo pueda explicarla con mis palabras.

## Prompt 4: abrir el sitio

> Ábrelo por favor.

**Qué produjo.** El asistente abrió https://sergiocaballeroo.github.io/examen1-cajero/ en el navegador para que lo recorriera.

## Prompt 5: rediseño visual sobrio y creíble

> ¿Puedes buscar una interfaz que use colores o una paleta de colores seria, que el diseño sea sobrio y elegante pero lo suficientemente real para creer que es un banco o así? Busca todo lo necesario por favor, como tipo que tú veas, para que sea posible que sea un buen proyecto a nivel diseño.

**Qué produjo.** El asistente buscó en la web referencias de interfaces de cajero y guías de color para banca y fintech, y aplicó estas conclusiones: azul marino como base de confianza, superficies blancas y grises fríos, dorado únicamente como acento pequeño, y verde y rojo solo con significado. Con eso:

- Reescribió `css/estilos.css` completo.
- Creó la marca ficticia "Banco Meridiano" con logotipo en SVG, para no imitar a un banco real.
- Agregó las tipografías Inter (texto) y Manrope (títulos) desde Google Fonts, con respaldo a fuentes del sistema.
- Añadió una tarjeta de débito ilustrada en la bienvenida, iconos SVG en el menú, etiquetas de operación en dorado en los pasos intermedios, el pie del cajero con aviso de seguridad y el comprobante estilo ticket.
- Limitó el anillo de foco a la navegación con teclado para que no aparezca al usar mouse.

Una prueba cambió porque el título "Monto a depositar" pasó a "¿Cuánto desea depositar?". Las 32 pruebas volvieron a pasar, en local y contra el sitio publicado.

Durante el rediseño pregunté:

> ¿Por qué Meridiano?

Respuesta del asistente: es un nombre inventado para no imitar a un banco real en un trabajo público; suena a institución financiera seria y el logotipo (un círculo con una línea horizontal) representa un meridiano. Se cambia en `js/banco.js` y en el encabezado de `index.html`.

## Prompt 6: que de verdad parezca un cajero

> Esto no parece la interfaz de un banco, la neta.

**Qué produjo.** El asistente reconoció que las dos versiones anteriores se veían como una página web metida en un marco (tarjetas redondeadas, sombras, teclado como widget) y me ofreció tres direcciones con un boceto de cada una: pantalla azul a pantalla completa estilo BBVA, pantalla blanca con franja de color estilo Banorte o Santander, y cajero clásico con botones físicos a los lados. Elegí la tercera:

> Cajero clásico con botones laterales.

Con esa decisión se rehicieron `index.html`, `css/estilos.css` y la parte de vistas de `js/app.js`:

- Carcasa gris metálico con la pantalla azul al centro, cuatro botones físicos a cada lado, teclado numérico abajo (teclas claras, Cancelar rojo, Borrar amarillo, Aceptar verde) y ranuras de tarjeta, comprobante y efectivo.
- Cada pantalla define qué opción va en cada uno de los ocho renglones laterales; la opción se activa tocándola o con su botón físico. La posición de los botones se calcula en JavaScript para que siempre queden a la altura de su opción.
- Comprobante como ticket impreso, ranura de efectivo que se ilumina tras un retiro, logotipo grande en la bienvenida.
- En celular los botones laterales se ocultan y las opciones pasan a la pantalla.

Las pruebas detectaron un error del nuevo diseño: al escribir con el teclado físico, el foco saltaba al primer botón habilitado, que era "Cancelar", y Enter lo activaba. Se corrigió moviendo el foco solo al cambiar de pantalla y dando prioridad a la acción principal. Dos pruebas se ajustaron a los nuevos textos y al nuevo lugar del botón Salir. Las 32 pruebas volvieron a pasar.

## Prompt 7: que quepa completo en la ventana

> No se ve la pantalla completa.

Adjunté una captura donde el teclado quedaba cortado abajo del borde del navegador.

**Qué produjo.** La carcasa mide unos 940 píxeles de alto y en una laptop no cabía. Se agregó una función que mide la carcasa y, si no cabe, la reduce proporcionalmente (con `transform: scale`) para que pantalla, botones laterales y teclado se vean siempre completos sin desplazarse. Se recalcula al cambiar el tamaño de la ventana y al cambiar de pantalla, y la alineación de los botones físicos toma en cuenta la escala. Se verificó en 1366 por 768, 1536 por 730 y 1920 por 969 píxeles. Las 32 pruebas siguen pasando.

## Prompt 8: animaciones

> Bien la lógica, ¿puedes agregarle animaciones?

**Qué produjo.** Se agregaron animaciones con sentido físico, no decorativas: la tarjeta asoma en la ranura y entra al presionar "Insertar tarjeta" (la pantalla pide el NIP cuando termina de entrar), y sale parpadeando al cerrar la sesión; los billetes salen de la ranura de efectivo tras un retiro; el comprobante se imprime en pantalla y un papel cae de su ranura; cada cambio de pantalla entra con un desvanecimiento corto; las casillas del NIP y el monto reaccionan a cada dígito; la luz de la ranura de tarjeta parpadea en la bienvenida; y al usar un botón físico la opción en pantalla se ilumina un instante antes de ejecutarse. Todas se desactivan si el sistema tiene activada la opción de reducir movimiento. Las pruebas se ajustaron para esperar a que la tarjeta termine de entrar. Un primer intento colocaba los billetes al fondo del panel en vez de bajo la ranura; se corrigió envolviendo la ranura de efectivo igual que las demás. Las 32 pruebas pasan.

## Cómo reproducir el proceso

1. Instalar Claude Code y abrir una terminal en una carpeta vacía.
2. Pegar el Prompt 1 con la foto o el texto del enunciado.
3. Responder las preguntas de orientación como en el Prompt 2, o con otras decisiones.
4. Pedir que ejecute las pruebas y publique el repositorio.
5. Revisar el resultado y pedir ajustes con nuevos prompts, como en los prompts 3, 5, 6, 7 y 8.

Los prompts que se usen después de esta versión se agregan al final de este archivo.
