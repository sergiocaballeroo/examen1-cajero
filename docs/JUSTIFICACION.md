# Justificación de las decisiones de diseño e implementación

Examen 1. Interfaz gráfica para un cajero automático.
Sergio Jair Caballero Martínez. 2026-11-20.

Para cada decisión explico qué hice y por qué lo hice así. Al final están las limitaciones.

## 1. Decisiones de diseño (cómo se ve y cómo se usa)

### 1.1 Se parece a un cajero de verdad: pantalla a la izquierda, teclado numérico a la derecha

Hice que la página se vea como un cajero: una pantalla y a un lado un teclado con números y tres teclas de color, Borrar (amarillo), Cancelar (rojo) y Aceptar (verde).

Lo hice así porque todo el mundo ya sabe usar un cajero. Si la interfaz se parece a lo que la gente conoce, no tiene que aprender nada nuevo. Los colores del teclado son los mismos que usan los cajeros reales, así que el usuario sabe cuál tecla confirma y cuál cancela sin leer.

Descarté hacer un formulario normal de página web con cajitas de texto, porque no se parece a un cajero, deja pegar texto y escribir letras, y el examen pide un cajero.

### 1.2 Cada pantalla pide una sola cosa

Cada pantalla pide solo un dato: el NIP, o elegir la operación, o el monto, o la cuenta, o confirmar. Nunca hay dos cosas que llenar al mismo tiempo.

Lo hice así porque en un cajero la gente está de pie, con prisa y con fila detrás. Si solo hay una cosa que hacer en pantalla, no hay forma de equivocarse de campo y el flujo se siente rápido.

### 1.3 Letras grandes, botones grandes y mucho contraste

El texto base es de 18 píxeles (en una página normal son 16), los botones miden al menos 60 píxeles de alto y las teclas 64. El texto es azul oscuro sobre fondo casi blanco.

Lo hice así porque un botón grande es más fácil de atinar, sobre todo en pantalla táctil, y porque el cajero lo usa gente de todas las edades, incluyendo personas que ven poco. Verifiqué que los colores tengan contraste alto para que se lean bien incluso con reflejos.

### 1.4 El NIP se ve como puntos en cuatro casillas

Al escribir el NIP aparecen puntos, nunca los números. El botón Aceptar se activa hasta que hay cuatro dígitos.

Lo hice así por seguridad: alguien detrás no puede ver el NIP. Las casillas sirven para que el usuario sepa cuántos dígitos lleva. Y si Aceptar no se activa hasta tener cuatro, no hay forma de mandar un NIP incompleto, que sería el error más común.

### 1.5 Se muestran los intentos que quedan y a los tres fallos se bloquea la tarjeta

La pantalla dice "Intentos disponibles: 3" y después de cada fallo "NIP incorrecto. Le quedan 2 intentos". Al tercer fallo aparece "Tarjeta retenida" con la explicación de qué hacer.

Lo hice así porque el usuario tiene que saber en qué situación está antes de quedarse sin tarjeta. Tres intentos es lo que hacen los bancos en México. El mensaje de bloqueo no solo dice que falló, dice qué sigue: ir a sucursal o llamar.

### 1.6 Montos rápidos y la opción "Otro monto"

En retiro hay seis botones con montos comunes ($200, $500, $1,000, $2,000, $3,000 y $5,000) y un botón "Otro monto" para escribir uno diferente.

Lo hice así porque es más fácil tocar un botón que teclear un número, y la mayoría de los retiros son de esos montos. Además, esos botones ya son montos válidos, así que no hay error de múltiplo. "Otro monto" queda para quien necesite algo distinto.

### 1.7 Los mensajes de error dicen exactamente qué está mal

Cada regla tiene su propio mensaje. Ejemplos: "El monto debe ser múltiplo de $100.00 (billetes disponibles: 100, 200 y 500)", "Supera su límite diario de retiro. Hoy aún puede retirar $2,500.00", "El dígito verificador de la CLABE no coincide. Revise el número". El mensaje sale en rojo justo debajo del dato que se escribió.

Lo hice así porque un mensaje tipo "monto inválido" obliga a adivinar. Si el mensaje dice cuál es la regla y, cuando se puede, cuánto sí se puede, el usuario corrige en un paso.

### 1.8 Antes de mover dinero se confirma, y después se da un comprobante

Retiro y depósito pasan por una pantalla que resume operación, monto, destino y cuenta de cargo, con un botón verde Confirmar. Al terminar sale un comprobante con folio, fecha, monto, saldo anterior y saldo actual; en los retiros también dice con qué billetes se entregó el dinero.

Lo hice así porque son operaciones que no se pueden deshacer. La confirmación le da al usuario una última oportunidad de revisar. El comprobante le deja claro que la operación sí se hizo y cuánto le quedó. El verde solo se usa en Confirmar para que nunca se confunda con un "Continuar" normal.

### 1.9 Siempre hay forma de cancelar o regresar

La tecla roja Cancelar funciona en todas las pantallas: en una captura regresa al menú y en el menú termina la sesión. Cada pantalla intermedia tiene además su botón Regresar o Cancelar, y arriba a la derecha está Salir durante toda la sesión.

Lo hice así porque el usuario debe poder salirse de cualquier paso sin terminar lo que empezó, y porque Cancelar hace siempre lo mismo en toda la app, así no hay sorpresas.

### 1.10 La sesión se cierra sola si no hay actividad, pero avisa antes

A los 45 segundos sin tocar nada aparece "¿Sigue ahí?" con una cuenta regresiva de 15 segundos y un botón Continuar. Si no responde, la sesión se cierra y la pantalla de despedida dice que fue por inactividad.

Lo hice así porque un cajero es público: si alguien se va y deja la sesión abierta, el siguiente podría usar su cuenta. El aviso evita cerrarle la sesión a alguien que solo estaba leyendo. Cualquier toque o tecla reinicia el contador, así que quien está usando el cajero nunca ve el aviso.

### 1.11 La consulta de saldo muestra algo más que el saldo

Además del saldo muestra "Disponible para retirar hoy en cajero" y los últimos cinco movimientos.

Lo hice así porque cuando alguien consulta su saldo normalmente quiere saber cuánto puede sacar o si ya le cayó un depósito. Mostrarlo ahí le ahorra otra operación. Son solo cinco movimientos para que la pantalla no se llene.

### 1.12 Al escribir la CLABE se agrupa de cuatro en cuatro y se muestra el banco

Mientras se escribe la CLABE aparece "n de 18 dígitos" y, desde el tercer dígito, el nombre del banco (o "Institución no reconocida"). Los números se ven en grupos de cuatro.

Lo hice así porque dieciocho dígitos seguidos son muy difíciles de revisar; en grupos de cuatro se detectan los errores de dedo. Ver el banco antes de continuar es una revisión extra: si esperaba Banorte y dice Santander, el usuario se da cuenta de inmediato.

### 1.13 Funciona en celular y no tiene modo oscuro

En pantallas angostas el teclado se pasa abajo de la pantalla y el menú queda en una columna. La pantalla del cajero siempre es clara, no cambia con el tema del sistema.

Lo hice así para que el examen se pueda revisar desde cualquier dispositivo. No puse modo oscuro porque un cajero real siempre se ve igual, y porque mantener dos esquemas de color implica revisar el contraste dos veces.

### 1.14 Se puede usar con el teclado físico y con lector de pantalla

Toda la app se maneja con el teclado de la computadora: números, Retroceso para borrar, Enter para aceptar, Esc para cancelar y Tab para moverse. Los mensajes de error se anuncian a lectores de pantalla y al cambiar de pantalla el foco queda en el botón principal.

Lo hice así porque no toda la gente usa el mouse o la pantalla táctil, y porque es parte de hacer una interfaz que cualquiera pueda usar. En las pruebas automáticas el segundo intento de NIP se escribe con teclado físico para comprobar que funciona.

## 2. Decisiones de implementación (cómo está hecho por dentro)

### 2.1 HTML, CSS y JavaScript puros, sin frameworks ni compilación

La aplicación son cinco archivos de texto. No usa React, Angular ni nada que haya que instalar o compilar.

Lo hice así porque el entregable tiene que correr en cualquier computadora: basta abrir `index.html` con doble clic o entrar a GitHub Pages. No hay versiones de Node ni dependencias que puedan fallar en la máquina del profesor. Para una app de pocas pantallas un framework sería más peso que ayuda. En la Tarea 2 usé Angular; aquí escogí a propósito lo contrario porque lo importante era que el entregable se ejecute sin problemas.

### 2.2 Los scripts se cargan de forma clásica, no como módulos

Los tres archivos de JavaScript se cargan con etiquetas `<script>` normales; cada uno deja un objeto global (`Validaciones`, `Banco`) y el resto queda encerrado en una función para no ensuciar el espacio global.

Lo hice así porque los módulos modernos (`type="module"`) no cargan cuando se abre el archivo directo desde el disco (el navegador los bloquea por seguridad). Con scripts clásicos la app funciona con doble clic, que es la forma más sencilla de ejecutarla.

### 2.3 Tres archivos con responsabilidades separadas

`validaciones.js` solo tiene algoritmos (CLABE, Luhn, formato de dinero). `banco.js` tiene las reglas y el estado de la cuenta y nunca toca la pantalla. `app.js` solo dibuja pantallas y convierte clics en llamadas al banco.

Lo hice así para que las reglas se puedan cambiar en un solo lugar (el objeto `REGLAS`), para poder probarlas sin navegador, y porque en un sistema real `banco.js` se cambiaría por llamadas al servidor sin tocar la interfaz.

### 2.4 La interfaz es una máquina de estados que redibuja la pantalla completa

El programa guarda en qué pantalla está y unos cuantos datos (dígitos escritos, mensaje de error, cuenta destino, operación pendiente). Cada vez que algo cambia, vuelve a generar todo el HTML de la pantalla.

Lo hice así porque con catorce pantallas pequeñas es más simple y más seguro redibujar todo que ir actualizando pedazos: nunca queda un botón activo de la pantalla anterior ni un mensaje de error viejo. Redibujar una pantalla de este tamaño es instantáneo.

### 2.5 El teclado escribe en un solo campo activo, con tope de dígitos

El teclado en pantalla y el físico escriben en el campo que la pantalla esté pidiendo (NIP, monto o cuenta). Si la pantalla no pide números, las teclas se ven apagadas. Cada campo tiene un máximo: 4 dígitos para NIP, 5 para montos, 16 para tarjeta y 18 para CLABE.

Lo hice así porque en un cajero real el teclado solo sirve cuando la pantalla pide un número. El tope de dígitos evita errores desde el principio: no se puede escribir una CLABE de 19 dígitos.

### 2.6 Reglas parecidas a las de un banco real

Retiro en múltiplos de $100 (el cajero simula billetes de 100, 200 y 500), mínimo $100, máximo $6,000 por operación y $9,000 al día. Depósito a otra cuenta hasta $20,000 por operación y nunca más que el saldo. Tres intentos de NIP. Sesión de 60 segundos.

Lo hice así porque el examen pedía reglas como las de un banco y estos valores son del orden de los que usan los bancos mexicanos. Todos están juntos en `REGLAS` para poder cambiarlos sin tocar la lógica. El acumulado diario se reinicia solo cuando cambia la fecha.

### 2.7 La CLABE y la tarjeta se validan de verdad, no solo por longitud

La CLABE se revisa con el algoritmo oficial del dígito verificador (los primeros 17 dígitos se multiplican por 3, 7 y 1 en ciclo, se suman los residuos de dividir entre 10 y el dígito final debe cuadrar). Los tres primeros dígitos se buscan en un catálogo de bancos (es el código que Banxico asigna a cada institución). La tarjeta se revisa con el algoritmo de Luhn, que es el que usan todas las tarjetas bancarias.

Lo hice así porque revisar solo que tenga 18 dígitos dejaría pasar casi cualquier error de dedo. El dígito verificador existe justo para atrapar un dígito mal escrito o dos dígitos volteados. Las cuentas de prueba que incluí tienen dígito verificador correcto, las calculé con el mismo algoritmo.

### 2.8 El depósito a otra cuenta se descuenta de la cuenta del titular

"Depósito a otra cuenta" manda dinero de la cuenta con la que se entró a la cuenta destino. No se simula meter billetes.

Lo hice así porque el flujo del examen empieza con el ingreso al sistema, así que ya hay una cuenta de donde tomar el dinero. Simular una ranura de billetes sería una pantalla inventada que no aporta nada al diseño. Por lo mismo no se permite depositar a la propia cuenta desde esta opción.

### 2.9 El saldo y los movimientos se guardan en el navegador

Saldo, movimientos, intentos fallidos, bloqueo y lo retirado en el día se guardan en `localStorage` (un almacenamiento del navegador). Si no está disponible, la app sigue funcionando en memoria.

Lo hice así para que la demostración sea creíble: el saldo que queda después de un retiro sigue ahí al recargar la página, y la tarjeta bloqueada sigue bloqueada, como pasaría en el banco. El enlace "Restablecer demostración" existe para que quien revise pueda volver al estado inicial sin tener que borrar datos del navegador a mano.

### 2.10 El NIP se compara en el navegador (limitación que reconozco)

El NIP 8420 está escrito en `banco.js` y se compara ahí mismo.

Lo hice así porque el examen fija el NIP y la app no tiene servidor. En un cajero real el NIP viaja cifrado al banco y nunca se guarda en el cajero. Lo dejo documentado como una limitación consciente; gracias a la separación en archivos, bastaría cambiar la función `validarNip` por una llamada al servidor.

### 2.11 Dinero y fechas con el formato de México

Los montos se muestran con el formato de pesos mexicanos y dos decimales, y las fechas en hora de la Ciudad de México en formato de 24 horas. Lo hace el propio navegador con las funciones `Intl`.

Lo hice así para no escribir a mano comas de miles ni símbolos, y para que el comprobante muestre la hora local del cajero aunque la computadora esté configurada en otra zona horaria.

### 2.12 Pruebas automáticas

El archivo `scripts/pruebas.mjs` usa Playwright (una herramienta que controla un navegador) para recorrer los cuatro flujos y hacer 32 verificaciones: NIP incorrecto y bloqueo, teclado físico, múltiplos y límites de retiro, CLABE con dígito verificador mal, cuenta propia, banco no reconocido, tarjeta que no pasa Luhn, saldo insuficiente, que el saldo persista al recargar, que en celular no haya desplazamiento horizontal y que no haya errores en la consola. En la misma corrida se generan las capturas de la carpeta `evidencias/capturas`.

Lo hice así porque probar a mano catorce pantallas con todas sus reglas es lento y siempre se olvida algo. De hecho la primera corrida encontró un error real: el aviso de inactividad tenía `display: grid` y eso le ganaba al atributo `hidden`, así que una capa transparente tapaba toda la pantalla y no dejaba hacer clic. Se corrigió con la regla `.modal[hidden] { display: none; }`.

### 2.13 Publicado en GitHub Pages directo desde la rama principal

El sitio se sirve desde la raíz de la rama `main`, sin ningún proceso de construcción. Un archivo `.nojekyll` evita que GitHub procese los archivos.

Lo hice así porque, como no hay compilación, cada commit queda publicado en segundos y el código que se ve en el repositorio es exactamente el que se ejecuta.

## 3. Limitaciones conocidas

- No hay servidor: el NIP, el saldo y las cuentas son simulados en el navegador.
- No se simula la lectura física de la tarjeta ni la entrada de billetes.
- El catálogo de bancos tiene las instituciones más comunes, no las más de cien del catálogo completo.
- El comprobante no se imprime; se muestra en pantalla.
