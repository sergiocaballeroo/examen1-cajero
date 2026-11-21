# Prompts usados para generar la aplicación

Examen 1. Interfaz gráfica para un cajero automático.
Sergio Jair Caballero Martínez. 2026-11-20.

## Herramienta

La aplicación se generó con **Claude Code** (Anthropic), modelo Claude Fable 5.1, desde la terminal de Windows 11. Claude Code trabaja directamente sobre la carpeta del proyecto: crea y edita archivos, ejecuta pruebas, hace commits y publica en GitHub.

El trabajo se hizo por etapas. Cada etapa tiene su prompt; se ejecutan en orden, en la misma sesión, y al final se obtiene la aplicación tal como está publicada. Las decisiones que cada prompt fija se explican en `JUSTIFICACION.md`.

## Etapa 1: alcance y arquitectura

```
Diseña e implementa la interfaz gráfica de un cajero automático como aplicación web.
Debe implementar cuatro funciones: a) ingreso al sistema con NIP (el NIP es 8420),
b) consulta de saldo, c) retiro de efectivo y d) depósito a otra cuenta.

Restricciones técnicas:
- HTML, CSS y JavaScript puros. Sin frameworks, sin empaquetador, sin paso de compilación.
- Debe funcionar abriendo index.html directamente desde el disco (file://) y también publicada
  en GitHub Pages. Por eso usa scripts clásicos con <script src>, no módulos ES.
- Separa el código en tres archivos con responsabilidades distintas:
  js/validaciones.js (algoritmos: CLABE, Luhn, formato de moneda),
  js/banco.js (reglas de negocio, estado de la cuenta, persistencia; no toca el DOM) y
  js/app.js (interfaz: máquina de estados que dibuja cada pantalla y maneja el teclado).
- Cada archivo va envuelto en una función inmediata y expone un solo objeto global.
- Idioma español de México. Moneda en pesos con dos decimales usando Intl.NumberFormat
  (es-MX). Fechas con Intl.DateTimeFormat en la zona America/Mexico_City, formato de 24 horas.
- Todo el texto en pantalla en lenguaje de usuario, sin jerga técnica.
```

## Etapa 2: reglas de negocio como en un banco real

```
Implementa en js/banco.js las reglas de operación de un banco mexicano real. Centraliza los
parámetros en un objeto REGLAS para poder ajustarlos sin tocar la lógica.

Ingreso:
- NIP de 4 dígitos, valor 8420. Tres intentos fallidos bloquean la tarjeta de forma
  persistente; al intentar de nuevo debe aparecer "tarjeta retenida".
- El NIP se compara en el cliente porque no hay servidor; documenta esto como limitación.

Retiro de efectivo:
- Múltiplos de $100 (el dispensador tiene billetes de 100, 200 y 500). Mínimo $100.
- Máximo $6,000 por operación y $9,000 acumulados por día. El acumulado diario se reinicia
  automáticamente al cambiar la fecha.
- No permitir retirar más que el saldo. Devolver el desglose de billetes entregados
  (mayor denominación primero).

Depósito a otra cuenta:
- Se carga a la cuenta del titular autenticado (no se simula entrada de billetes).
- Destino por CLABE de 18 dígitos o por tarjeta de 16 dígitos.
- La CLABE se valida con el algoritmo oficial del dígito verificador (ponderaciones 3, 7, 1
  cíclicas sobre los primeros 17 dígitos) y los tres primeros dígitos se buscan en un
  catálogo de códigos de institución de Banxico para mostrar el nombre del banco.
- La tarjeta se valida con el algoritmo de Luhn y se identifica la marca por el primer dígito.
- Mínimo $1, máximo $20,000 por operación, nunca mayor al saldo, nunca a la propia cuenta.

Generales:
- Toda operación exitosa genera un movimiento con folio consecutivo, fecha y monto.
- Saldo, movimientos, intentos fallidos, bloqueo y acumulado diario se guardan en
  localStorage bajo una sola clave; si no está disponible, trabajar en memoria.
- Incluye una función para restablecer la demostración al estado inicial.
- Datos de prueba: saldo inicial $12,500.00, cuatro movimientos previos, y cinco cuentas
  destino de prueba (tres CLABE y dos tarjetas) con dígito verificador válido, calculadas con
  los mismos algoritmos.
- Cada validación devuelve un mensaje específico que diga la regla y, cuando se pueda, el
  valor que sí es válido (por ejemplo cuánto se puede retirar todavía hoy).
```

## Etapa 3: diseño de la carcasa y la pantalla

```
Diseña la interfaz como un cajero automático clásico, no como una página web.

Carcasa (index.html y css/estilos.css):
- Carcasa gris metálico con degradado y bisel. Al centro, la pantalla; a cada lado, cuatro
  botones físicos (softkeys) con una guía que apunta al renglón de la pantalla que activan.
- Debajo: a la izquierda las ranuras de tarjeta (con luz verde) y de comprobante; al centro
  un teclado numérico tipo EPP de cuatro columnas (dígitos 1 a 9 y 0, y en la columna derecha
  Cancelar en rojo, Borrar en amarillo y Aceptar en verde, con teclas en relieve); a la
  derecha la ranura de efectivo y un aviso "Cubra el teclado al escribir su NIP".

Pantalla:
- Fondo azul profundo (#0b2a5b, más oscuro hacia abajo) con texto blanco, bisel negro y un
  reflejo suave de cristal. Barra superior con el logotipo y nombre del banco a la izquierda
  y la fecha y hora a la derecha.
- El cuerpo tiene tres columnas: cuatro renglones de opciones a la izquierda (L1 a L4),
  el contenido al centro, y cuatro renglones a la derecha (R1 a R4). Cada opción lleva una
  flecha hacia su botón físico: amarilla por defecto, verde para la acción principal, roja
  para cancelar o salir. Las opciones se activan tocándolas o con su botón físico.
- Posiciona los botones físicos con JavaScript a la altura exacta de su opción y recalcula
  al cambiar de pantalla y al cambiar el tamaño de la ventana.

Marca y tipografía:
- Banco ficticio "Banco Meridiano" con logotipo propio en SVG (un círculo cruzado por una
  línea horizontal). No usar nombres, colores ni logotipos de bancos reales.
- Fuente Inter desde Google Fonts con respaldo a Segoe UI y la fuente del sistema. El
  comprobante en fuente monoespaciada.
- Solo tres colores con significado en toda la interfaz: verde para aceptar y confirmar,
  rojo para cancelar y avisos, amarillo para borrar y para las flechas.
- Texto base de 18 píxeles, botones de al menos 56 píxeles de alto, contraste alto.
```

## Etapa 4: pantallas y flujo

```
Implementa en js/app.js una máquina de estados con estas pantallas. Cada pantalla devuelve el
contenido del centro y qué opción va en cada uno de los ocho renglones laterales. Al cambiar
de pantalla se redibuja todo el contenido. El teclado numérico escribe en el campo activo de la
pantalla (NIP, monto o cuenta) con un tope de dígitos (4, 5, 16 o 18); cuando no hay campo,
las teclas de dígitos se deshabilitan. El teclado físico de la computadora también funciona:
dígitos, Retroceso, Enter y Esc.

1. Bienvenida: logotipo grande, "Inserte su tarjeta". R4: Insertar tarjeta. L4: Restablecer
   demostración (con confirmación).
2. NIP: cuatro casillas que se llenan con puntos, nunca se muestra el dígito. Contador de
   intentos disponibles. R4: Aceptar (habilitado solo con 4 dígitos). L4: Cancelar.
3. Menú: L1 Consulta de saldo, L2 Depósito a otra cuenta, L4 Salir, R1 Retiro de efectivo.
   Muestra cuenta (terminación) y titular.
4. Saldo: saldo disponible en grande, "disponible para retirar hoy", últimos cinco
   movimientos. L4 Salir, R4 Otra operación.
5. Retiro: seis montos rápidos ($200, $500, $1,000, $2,000, $3,000, $5,000) en L1 a L3 y
   R1 a R3; R4 Otro monto; L4 Regresar. Las reglas aparecen como nota.
6. Otro monto: captura con el teclado, monto formateado en grande, mensaje de error debajo.
   L4 Cancelar, R4 Continuar.
7. Tipo de destino: L1 CLABE interbancaria, R1 Número de tarjeta, L4 Regresar.
8. Cuenta destino: dígitos agrupados de cuatro en cuatro, contador "n de 18 dígitos" y, desde
   el tercer dígito de una CLABE, el nombre del banco o "Institución no reconocida". Un
   desplegable con las cuentas de prueba que se pueden tocar para llenar el campo.
   L4 Cancelar, R4 Continuar (solo con la longitud completa).
9. Monto a depositar: igual que otro monto, mostrando el destino y el banco.
10. Confirmación: tabla con operación, monto, destino y cuenta de cargo.
    L4 "No, cancelar", R4 "Sí, confirmar".
11. Procesando: indicador de carga durante 1.8 segundos con texto según la operación.
12. Comprobante: ticket impreso (papel blanco, borde dentado, fuente monoespaciada) con folio,
    fecha, cuenta, operación, destino, monto, saldo anterior y saldo actual. En retiros, el
    desglose de billetes. L4 Salir, R4 Otra operación.
13. Tarjeta retenida: explicación y qué hacer. L4 Restablecer demostración.
14. Despedida: "Gracias por su visita, no olvide retirar su tarjeta", con el motivo si la sesión
    se cerró por inactividad. R4 Terminar. Regresa sola a la bienvenida a los 6 segundos.

Comportamiento general:
- La tecla Cancelar del teclado regresa al menú desde cualquier captura; en el menú y en el
  comprobante termina la sesión; en el NIP expulsa la tarjeta.
- Cierre por inactividad: a los 45 segundos sin actividad aparece un aviso "¿Sigue ahí?" con
  cuenta regresiva de 15 segundos y botón Continuar; si no hay respuesta la sesión se cierra.
  Cualquier toque o tecla reinicia el conteo.
- Los mensajes de error se muestran en un recuadro rojo con role="alert", junto al dato.
```

## Etapa 5: accesibilidad, celular y tamaño de ventana

```
- Toda la aplicación debe poder usarse con teclado: Tab entre controles, foco visible en
  amarillo, Enter y Esc. Al cambiar de pantalla, mueve el foco a la acción principal solo si
  la persona navega con teclado; con mouse o táctil no muestres el anillo de foco.
- La pantalla es una región aria-live; el aviso de inactividad es un alertdialog; el teclado
  en pantalla y los botones físicos tienen etiquetas; las casillas del NIP anuncian cuántos
  dígitos llevan sin revelarlos.
- En pantallas de menos de 900 píxeles de ancho oculta los botones físicos laterales y
  convierte las opciones en botones grandes dentro de la pantalla, uno debajo de otro; el
  teclado queda debajo. Sin desplazamiento horizontal a 400 píxeles.
- En computadora, si la carcasa completa no cabe en la ventana, redúcela proporcionalmente
  (transform: scale) para que pantalla, botones laterales y teclado se vean enteros sin
  desplazarse. Recalcula al cambiar el tamaño de la ventana y al cambiar de pantalla, y toma en
  cuenta la escala al alinear los botones físicos.
- No hay modo oscuro: la pantalla del cajero siempre se ve igual.
```

## Etapa 6: animaciones con sentido físico

```
Agrega animaciones que cuenten lo que pasa físicamente, sin adornos:
- La tarjeta asoma en su ranura mientras el cajero espera. Al presionar "Insertar tarjeta"
  entra en la ranura (1 segundo) y solo entonces la pantalla pide el NIP. Al terminar la
  sesión la tarjeta sale de la ranura y parpadea hasta que se toma. Si la tarjeta queda
  retenida, no sale.
- Tras un retiro, tres billetes salen escalonados de la ranura de efectivo y la ranura se
  ilumina unos segundos.
- En el comprobante, el ticket se imprime en pantalla de arriba hacia abajo y un papel cae de
  la ranura de comprobante.
- Cada cambio de pantalla entra con un desvanecimiento corto (menos de 0.3 segundos).
- Las casillas del NIP y el monto capturado reaccionan a cada dígito nuevo.
- La luz de la ranura de tarjeta parpadea en la bienvenida.
- Al usar un botón físico lateral, la opción en pantalla se ilumina un instante antes de
  ejecutarse y el botón se hunde.
- Si el sistema tiene activada la preferencia de reducir movimiento, desactiva todas las
  animaciones y coloca cada elemento directamente en su posición final.
```

## Etapa 7: pruebas automatizadas

```
Escribe scripts/pruebas.mjs con Playwright (Chromium sin interfaz), sin framework de pruebas,
que recorra los cuatro flujos y verifique las reglas, y que al mismo tiempo guarde una captura
de cada pantalla en evidencias/capturas. Debe poder correr contra el archivo local o contra el
sitio publicado con la variable BASE. Casos mínimos:
- NIP incorrecto resta intentos; segundo intento con el teclado físico; NIP 8420 entra.
- Saldo inicial 12,500. Retiro rápido de 500 con comprobante, saldo 12,000 y un billete de 500.
- Otro monto: rechaza 150 (no múltiplo), rechaza 7,000 (máximo por operación), acepta 6,000,
  rechaza 3,000 por límite diario, acepta 2,000. Cancelar regresa al menú.
- Depósito: rechaza CLABE con dígito verificador incorrecto, rechaza la propia cuenta, muestra
  institución no reconocida, detecta Banorte, rechaza monto mayor a 20,000, acepta 1,250 y deja
  saldo 4,750. Tarjeta: rechaza una que no pasa Luhn, acepta una Mastercard válida, rechaza
  depósito mayor al saldo.
- Salir muestra la despedida; el saldo persiste tras recargar.
- Tres NIP incorrectos bloquean la tarjeta; el bloqueo persiste tras recargar; restablecer lo
  quita.
- A 400 píxeles de ancho no hay desplazamiento horizontal. No hay errores en la consola.
Fija la versión de Playwright en package.json. Documenta en el README cómo correrlas.
```

## Etapa 8: documentación y publicación

```
- README.md: qué es, las cuatro funciones, tres formas de ejecutar (GitHub Pages, abrir
  index.html, servidor local), datos de prueba (NIP, saldo, cuentas destino), reglas de
  operación, uso con teclado, estructura de archivos, capturas y cómo correr las pruebas.
- docs/JUSTIFICACION.md: para cada decisión de diseño y de implementación, qué se hizo y por
  qué, en primera persona y en lenguaje llano, sin citar teorías ni autores; al final las
  limitaciones conocidas.
- docs/PROMPTS.md: este archivo.
- Repositorio público en GitHub con un historial limpio, sin dependencias en el repositorio
  (node_modules ignorado) y publicado en GitHub Pages desde la raíz de la rama main con un
  archivo .nojekyll.
```

## Cómo reproducir el proceso

1. Instalar Claude Code y abrir una terminal en una carpeta vacía.
2. Pegar los prompts de las etapas 1 a 8 en orden, esperando a que cada etapa termine.
3. Pedir que ejecute las pruebas después de las etapas 4, 5 y 6 y corregir lo que falle.
4. Revisar el sitio publicado y pedir ajustes con prompts cortos si hace falta.
