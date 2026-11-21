# Prompts usados para generar la aplicación

Herramienta: Claude Code (Anthropic), modelo Claude Fable 5.1, en la terminal de Windows 11, el 2026-11-20.
Los prompts se transcriben tal como se escribieron. Lo que el asistente produjo a partir de cada uno se resume debajo.

## Prompt 1: planteamiento del examen (texto y foto del pizarrón)

> Recuerdas que me habías ayudado a llenar un tema de mi examen 1 que consistía en hacer una página web con esas características, me ayudarías con esto para hacer hoy el entregable?

Adjunto: fotografía del pizarrón con el enunciado:

> Examen 1
> Diseñar e implementar una interfaz gráfica para un cajero automático. Deberá implementar las siguientes funciones:
> a) Ingreso al sistema (NIP: 8420)
> b) Consulta de saldo
> c) Retiro de efectivo
> d) Depósito a otra cuenta
> \* Justificar cada una de las decisiones tomadas para el diseño e implementación.
> \* Incluir los prompts usados para generar la aplicación.

**Resultado.** El asistente recuperó el contexto de la tarea anterior de la materia (repositorio `tarea2-ia-ui`, Angular, reporte con carátula) y, antes de construir, planteó cuatro preguntas de orientación.

## Prompt 2: respuestas a las preguntas de orientación

Preguntas del asistente y respuestas dadas:

1. ¿Con qué tecnología hacemos la interfaz del cajero? (Angular 21 + Material, o HTML, CSS y JS puro)
   > Lo que sea mejor para hacer el entregable aunque igualmente considero que sería buena idea GitHub Pages y el entregable para ejecutar no? o no sé cómo lo pida el examen 1
2. ¿Qué entregables generamos hoy? (repo público + GitHub Pages, reporte Word/PDF, pruebas E2E)
   > Repo público + GitHub Pages, justo repo público
3. ¿Qué datos simulados usamos? NIP 8420 es fijo por el examen.
   > establece reglas como si fuera un banco real
4. ¿Cuál es la fecha de entrega para la carátula?
   > Hoy, 2026-11-20

**Resultado.** Con estas respuestas el asistente tomó las decisiones que se documentan en `JUSTIFICACION.md` y generó, en este orden:

1. `js/validaciones.js`: dígito verificador de CLABE, catálogo de bancos, algoritmo de Luhn, formato de moneda. Antes calculó con Node números de cuenta de prueba con dígito verificador válido.
2. `js/banco.js`: reglas (NIP 8420, 3 intentos, múltiplos de 100, límites por operación y por día, depósito hasta 20,000), cuenta simulada, persistencia en localStorage.
3. `js/app.js`: máquina de estados con catorce vistas, teclado en pantalla y físico, confirmación, comprobante, cierre por inactividad.
4. `index.html` y `css/estilos.css`: estructura de kiosco y estilos responsivos.
5. `scripts/pruebas.mjs`: 32 pruebas con Playwright que además generan las capturas.
6. Documentación: `README.md`, `docs/JUSTIFICACION.md` y este archivo.
7. Repositorio público en GitHub y publicación en GitHub Pages.

## Iteraciones durante la generación

Las correcciones no vinieron de prompts adicionales sino de las pruebas automatizadas que el propio asistente ejecutó:

- **Corrida 1.** Fallo en la primera prueba: el aviso de inactividad, aunque tenía el atributo `hidden`, se dibujaba por su regla `display: grid` y tapaba toda la pantalla. Corrección: `.modal[hidden] { display: none; }`.
- **Corrida 2.** Fallo en la prueba 24 por el propio script: intentaba hacer clic en una cuenta de prueba que estaba dentro de un desplegable cerrado. Corrección en la prueba (abrir el desplegable primero), no en la app.
- **Corrida 3.** 32 de 32 pruebas pasaron.

## Cómo reproducir el proceso

1. Instalar Claude Code y abrir una terminal en una carpeta vacía.
2. Pegar el Prompt 1 con la foto o el texto del enunciado.
3. Responder las preguntas de orientación como en el Prompt 2 (o con otras decisiones).
4. Pedir que ejecute pruebas y publique el repositorio.

Los prompts posteriores a la primera publicación (ajustes pedidos después de revisar el sitio) se agregan al final de este archivo conforme ocurren.

## Prompt 3: la justificación en lenguaje llano

> Espera el justificacion ni yo lo entiendo euristicas de nielsen y metafora de quiosko? dedonde sacas todo eso?

**Resultado.** La primera versión de `JUSTIFICACION.md` citaba heurísticas de Nielsen, la ley de Fitts y criterios WCAG. Se reescribió completa en primera persona y lenguaje cotidiano: para cada decisión, qué se hizo y por qué, sin teoría, de modo que el autor pueda explicarla con sus palabras.

## Prompt 4: abrir el sitio

> abrelo por favor

**Resultado.** El asistente abrió https://sergiocaballeroo.github.io/examen1-cajero/ en el navegador.

## Prompt 5: rediseño visual sobrio y creíble

> puedes buscar una interfaz que use colores o una paleta de colores seria, que el diseño sea sobrio y elegante pero lo suficientemente real para creer que es un banco o asi? busca todo lo necesario por favor como tipo que tu veas para que sea posible que sea un buen proyecto a nivel diseño

**Resultado.** El asistente buscó en la web referencias de interfaces de cajero y guías de color para banca y fintech. Conclusiones aplicadas: azul marino como base de confianza, superficies blancas y grises fríos, dorado solo como acento pequeño, verde y rojo únicamente con significado. Se reescribió `css/estilos.css` completo, se agregó la marca ficticia "Banco Meridiano" con logotipo en SVG, tipografías Inter y Manrope (Google Fonts con respaldo a fuentes del sistema), tarjeta de débito ilustrada en la bienvenida, iconos SVG en el menú, etiquetas de operación en dorado en los pasos intermedios, pie del cajero con aviso de seguridad y comprobante estilo ticket. Una prueba cambió porque el título "Monto a depositar" pasó a "¿Cuánto desea depositar?". Las 32 pruebas volvieron a pasar.

Pregunta intermedia del autor:

> por que meridiano?

Respuesta: es un nombre inventado para no imitar a un banco real en un trabajo público; suena a institución financiera seria y el logotipo (círculo con línea horizontal) representa un meridiano. Se cambia en `js/banco.js` y en el encabezado de `index.html`.
