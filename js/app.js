/*
 * Controlador de la interfaz del cajero.
 * Es una máquina de estados: cada "vista" devuelve el contenido del centro de la pantalla y
 * las opciones que van en los ocho renglones laterales (cuatro a la izquierda, L1 a L4, y
 * cuatro a la derecha, R1 a R4). Cada renglón queda alineado con un botón físico de la
 * carcasa, de modo que la opción se puede activar tocándola en la pantalla o con el botón.
 * El teclado numérico escribe en el campo activo de la vista (NIP, monto o cuenta).
 * Toda la lógica bancaria vive en banco.js; aquí solo hay presentación y flujo.
 */
(function () {
  'use strict';

  var REGLAS = Banco.REGLAS;
  var moneda = Validaciones.moneda;

  var $cuerpo, $teclado, $reloj, $modal, $modalSegundos, $ranuraEfectivo, $ranuraTarjeta;

  /** Estado de la interfaz (no del banco). */
  var ui = {
    vista: 'bienvenida',
    campo: null,          // 'nip' | 'monto' | 'cuenta' | null
    entrada: '',          // dígitos capturados con el teclado
    error: '',            // mensaje de validación de la vista actual
    sesion: false,
    tipoDestino: null,    // 'CLABE' | 'Tarjeta'
    destino: null,        // { tipo, numero, banco }
    operacion: null,      // { tipo: 'retiro' | 'deposito', monto }
    resultado: null,      // respuesta de Banco.retirar / Banco.depositar
    motivoSalida: ''
  };

  var temporizadores = { inactividad: null, aviso: null, cuenta: null, auto: null };
  var usaTeclado = false;
  var escala = 1; // factor con el que se reduce la carcasa para que quepa completa en la ventana

  // ---------------------------------------------------------------- Utilidades

  function fechaLarga(ms) {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(ms));
  }

  function fechaCorta(ms) {
    return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short' }).format(new Date(ms));
  }

  function limpiarTemporizador(nombre) {
    if (temporizadores[nombre]) {
      clearTimeout(temporizadores[nombre]);
      clearInterval(temporizadores[nombre]);
      temporizadores[nombre] = null;
    }
  }

  function ir(vista, extra) {
    ui.vista = vista;
    ui.entrada = '';
    ui.error = '';
    ui.campo = null;
    if (vista === 'nip') ui.campo = 'nip';
    if (vista === 'retiro-monto' || vista === 'deposito-monto') ui.campo = 'monto';
    if (vista === 'deposito-cuenta') ui.campo = 'cuenta';
    if (extra) Object.keys(extra).forEach(function (k) { ui[k] = extra[k]; });
    render(true);
  }

  // ---------------------------------------------------------------- Sesión e inactividad

  function iniciarSesion() {
    ui.sesion = true;
    reiniciarInactividad();
    ir('menu');
  }

  function cerrarSesion(motivo) {
    ui.sesion = false;
    ui.destino = null;
    ui.operacion = null;
    ui.resultado = null;
    detenerInactividad();
    ir('despedida', { motivoSalida: motivo || '' });
    limpiarTemporizador('auto');
    temporizadores.auto = setTimeout(function () { ir('bienvenida'); }, 6000);
  }

  function detenerInactividad() {
    limpiarTemporizador('inactividad');
    limpiarTemporizador('aviso');
    limpiarTemporizador('cuenta');
    $modal.hidden = true;
  }

  /** Reinicia el conteo de inactividad. Aplica desde la captura del NIP hasta que termina la sesión. */
  function reiniciarInactividad() {
    detenerInactividad();
    if (!ui.sesion && ui.vista !== 'nip') return;
    temporizadores.aviso = setTimeout(mostrarAviso, (REGLAS.INACTIVIDAD_SEG - REGLAS.AVISO_SEG) * 1000);
  }

  function mostrarAviso() {
    var restantes = REGLAS.AVISO_SEG;
    $modalSegundos.textContent = restantes;
    $modal.hidden = false;
    document.getElementById('btn-continuar').focus();
    temporizadores.cuenta = setInterval(function () {
      restantes -= 1;
      $modalSegundos.textContent = restantes;
      if (restantes <= 0) {
        detenerInactividad();
        if (ui.sesion) {
          cerrarSesion('Su sesión se cerró por inactividad para proteger su cuenta.');
        } else {
          ir('bienvenida');
        }
      }
    }, 1000);
  }

  // ---------------------------------------------------------------- Teclado

  function limiteEntrada() {
    if (ui.campo === 'nip') return 4;
    if (ui.campo === 'monto') return 5;
    if (ui.campo === 'cuenta') return ui.tipoDestino === 'CLABE' ? 18 : 16;
    return 0;
  }

  function teclaDigito(d) {
    if (!ui.campo) return;
    if (ui.entrada.length >= limiteEntrada()) return;
    ui.entrada += d;
    ui.error = '';
    render();
  }

  function teclaBorrar() {
    if (!ui.campo || !ui.entrada) return;
    ui.entrada = ui.entrada.slice(0, -1);
    ui.error = '';
    render();
  }

  function teclaCancelar() {
    switch (ui.vista) {
      case 'bienvenida':
      case 'despedida':
      case 'bloqueada':
      case 'procesando':
        return;
      case 'nip':
        detenerInactividad();
        ir('bienvenida');
        return;
      case 'menu':
      case 'comprobante':
        cerrarSesion('');
        return;
      default:
        ir('menu');
    }
  }

  function teclaAceptar() {
    switch (ui.vista) {
      case 'bienvenida': insertarTarjeta(); break;
      case 'nip': enviarNip(); break;
      case 'retiro-monto': enviarMontoRetiro(); break;
      case 'deposito-cuenta': enviarCuentaDestino(); break;
      case 'deposito-monto': enviarMontoDeposito(); break;
      case 'confirmar': ejecutarOperacion(); break;
      case 'saldo':
      case 'comprobante': ir('menu'); break;
      case 'despedida': ir('bienvenida'); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- Acciones de cada vista

  function insertarTarjeta() {
    if (Banco.estaBloqueada()) {
      ir('bloqueada');
      return;
    }
    ir('nip');
    reiniciarInactividad();
  }

  function enviarNip() {
    if (ui.entrada.length < 4) {
      ui.error = 'Ingrese los 4 dígitos de su NIP.';
      render();
      return;
    }
    var r = Banco.validarNip(ui.entrada);
    if (r.ok) {
      iniciarSesion();
      return;
    }
    if (r.bloqueada) {
      detenerInactividad();
      ir('bloqueada');
      return;
    }
    ui.entrada = '';
    ui.error = 'NIP incorrecto. Le queda' + (r.restantes === 1 ? ' 1 intento.' : 'n ' + r.restantes + ' intentos.');
    render();
  }

  function montoCapturado() {
    return ui.entrada ? Number(ui.entrada) : 0;
  }

  function elegirMontoRetiro(monto) {
    var v = Banco.validarRetiro(monto);
    if (!v.ok) {
      ui.error = v.mensaje;
      render();
      return;
    }
    ir('confirmar', { operacion: { tipo: 'retiro', monto: monto } });
  }

  function enviarMontoRetiro() {
    elegirMontoRetiro(montoCapturado());
  }

  function elegirTipoDestino(tipo) {
    ir('deposito-cuenta', { tipoDestino: tipo, destino: null });
  }

  function enviarCuentaDestino() {
    var r = Banco.validarDestino(ui.tipoDestino, ui.entrada);
    if (!r.ok) {
      ui.error = r.mensaje;
      render();
      return;
    }
    ir('deposito-monto', { destino: { tipo: ui.tipoDestino, numero: ui.entrada, banco: r.banco } });
  }

  function enviarMontoDeposito() {
    var monto = montoCapturado();
    var v = Banco.validarDeposito(monto);
    if (!v.ok) {
      ui.error = v.mensaje;
      render();
      return;
    }
    ir('confirmar', { operacion: { tipo: 'deposito', monto: monto } });
  }

  function ejecutarOperacion() {
    var op = ui.operacion;
    if (!op) return;
    ir('procesando');
    detenerInactividad();
    limpiarTemporizador('auto');
    temporizadores.auto = setTimeout(function () {
      var r = op.tipo === 'retiro'
        ? Banco.retirar(op.monto)
        : Banco.depositar(ui.destino.tipo, ui.destino.numero, op.monto);
      if (!r.ok) {
        ir('menu', { error: r.mensaje });
      } else {
        ir('comprobante', { resultado: r });
        if (op.tipo === 'retiro') {
          $ranuraEfectivo.classList.add('ranura__boca--activa');
          setTimeout(function () { $ranuraEfectivo.classList.remove('ranura__boca--activa'); }, 4000);
        }
      }
      reiniciarInactividad();
    }, 1800);
  }

  // ---------------------------------------------------------------- Vistas

  /** Opción lateral. attrs: cadena de atributos data-*; clases: modificadores de .opcion. */
  function op(texto, attrs, clases, deshabilitada) {
    return '<button type="button" class="opcion ' + (clases || '') + '" ' + (attrs || '') + (deshabilitada ? ' disabled' : '') + '>' + texto + '</button>';
  }

  function cabecera(titulo, subtitulo, eyebrow) {
    return (eyebrow ? '<p class="pantalla__eyebrow">' + eyebrow + '</p>' : '') +
      '<h1 class="pantalla__titulo">' + titulo + '</h1>' +
      (subtitulo ? '<p class="pantalla__sub">' + subtitulo + '</p>' : '');
  }

  function mensajeError() {
    return ui.error ? '<p class="alerta" role="alert">' + ui.error + '</p>' : '';
  }

  function tarjetaCuenta() {
    return '<p class="cuenta-chip">Cuenta terminación ' + Banco.CUENTA.numero.slice(-4) + ' · ' + Banco.CUENTA.titular + '</p>';
  }

  function indicacion(texto) {
    return '<p class="indicacion">' + texto + '</p>';
  }

  var LOGO = '<svg class="logo-grande" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="5"/><path d="M10 32h44" stroke="currentColor" stroke-width="5"/></svg>';

  function vistaBienvenida() {
    return {
      centro: '<div class="centro centro--medio">' + LOGO +
        cabecera('Bienvenido a ' + Banco.CUENTA.banco, 'Inserte su tarjeta para comenzar.') +
        '<p class="nota">Simulación académica. Cuenta de prueba con NIP 8420.</p>' +
        indicacion('Presione el botón "Insertar tarjeta" o la tecla Aceptar.') + '</div>',
      izq: [null, null, null, op('Restablecer demostración', 'data-accion="restablecer"', 'opcion--suave')],
      der: [null, null, null, op('Insertar tarjeta', 'data-accion="insertar"', 'opcion--der opcion--primaria')]
    };
  }

  function vistaNip() {
    var puntos = '';
    for (var i = 0; i < 4; i++) {
      puntos += '<span class="nip__caja' + (i < ui.entrada.length ? ' nip__caja--lleno' : '') + '">' + (i < ui.entrada.length ? '●' : '') + '</span>';
    }
    return {
      centro: '<div class="centro">' + cabecera('Ingrese su NIP', 'Use el teclado numérico y cubra sus manos.') +
        '<div class="nip" aria-label="NIP capturado: ' + ui.entrada.length + ' de 4 dígitos">' + puntos + '</div>' +
        mensajeError() +
        '<p class="nota">Intentos disponibles: ' + Banco.intentosRestantes() + '</p>' +
        indicacion('Al terminar presione Aceptar.') + '</div>',
      izq: [null, null, null, op('Cancelar', 'data-accion="cancelar"', 'opcion--peligro')],
      der: [null, null, null, op('Aceptar', 'data-accion="aceptar"', 'opcion--der opcion--primaria', ui.entrada.length < 4)]
    };
  }

  function vistaMenu() {
    return {
      centro: '<div class="centro">' + cabecera('¿Qué operación desea realizar?', '') + tarjetaCuenta() + mensajeError() +
        indicacion('Seleccione una opción con los botones laterales.') + '</div>',
      izq: [
        op('Consulta de saldo', 'data-accion="ir" data-vista="saldo"'),
        op('Depósito a otra cuenta', 'data-accion="ir" data-vista="deposito-tipo"'),
        null,
        op('Salir', 'data-accion="salir" id="btn-salir"', 'opcion--peligro')
      ],
      der: [
        op('Retiro de efectivo', 'data-accion="ir" data-vista="retiro"', 'opcion--der'),
        null, null, null
      ]
    };
  }

  function vistaSaldo() {
    var s = Banco.consultarSaldo();
    var filas = s.movimientos.map(function (m) {
      return '<tr><td>' + fechaCorta(m.fecha) + '</td><td>' + m.tipo + '</td><td class="num ' + (m.monto < 0 ? 'neg' : 'pos') + '">' + moneda(m.monto) + '</td></tr>';
    }).join('');
    return {
      centro: '<div class="centro">' + cabecera('Consulta de saldo', '') + tarjetaCuenta() +
        '<div class="saldo"><p class="saldo__etiqueta">Saldo disponible</p><p class="saldo__monto">' + moneda(s.saldo) + '</p>' +
        '<p class="nota">Disponible para retirar hoy en cajero: ' + moneda(s.disponibleHoy) + '</p></div>' +
        '<div class="tabla-scroll"><table class="movimientos"><tbody>' + filas + '</tbody></table></div></div>',
      izq: [null, null, null, op('Salir', 'data-accion="salir"', 'opcion--peligro')],
      der: [null, null, null, op('Otra operación', 'data-accion="ir" data-vista="menu"', 'opcion--der opcion--primaria')]
    };
  }

  function vistaRetiro() {
    var m = REGLAS.MONTOS_RAPIDOS;
    function monto(i, der) {
      return op(moneda(m[i]), 'data-accion="monto-retiro" data-monto="' + m[i] + '"', der ? 'opcion--der' : '');
    }
    return {
      centro: '<div class="centro">' + cabecera('Retiro de efectivo', 'Seleccione el monto que desea retirar.') + mensajeError() +
        '<p class="nota">Múltiplos de ' + moneda(REGLAS.RETIRO_MULTIPLO) + '. Máximo ' + moneda(REGLAS.RETIRO_MAX_OPERACION) + ' por operación y ' + moneda(REGLAS.RETIRO_MAX_DIARIO) + ' al día.</p>' +
        indicacion('Billetes disponibles: 100, 200 y 500.') + '</div>',
      izq: [monto(0), monto(2), monto(4), op('Regresar', 'data-accion="ir" data-vista="menu"', 'opcion--peligro')],
      der: [monto(1, true), monto(3, true), monto(5, true), op('Otro monto', 'data-accion="ir" data-vista="retiro-monto"', 'opcion--der opcion--primaria')]
    };
  }

  function vistaMonto(titulo, ayuda, regla, eyebrow) {
    return {
      centro: '<div class="centro">' + cabecera(titulo, ayuda, eyebrow) +
        '<p class="captura' + (ui.entrada ? '' : ' captura--vacia') + '">' + (ui.entrada ? moneda(montoCapturado()) : '$ 0.00') + '</p>' +
        mensajeError() +
        '<p class="nota">' + regla + '</p>' +
        indicacion('Escriba el monto con el teclado y presione Aceptar.') + '</div>',
      izq: [null, null, null, op('Cancelar', 'data-accion="cancelar"', 'opcion--peligro')],
      der: [null, null, null, op('Continuar', 'data-accion="aceptar"', 'opcion--der opcion--primaria', !ui.entrada)]
    };
  }

  function vistaRetiroMonto() {
    return vistaMonto('Escriba el monto a retirar', 'Solo billetes de 100, 200 y 500.',
      'Entre ' + moneda(REGLAS.RETIRO_MIN) + ' y ' + moneda(REGLAS.RETIRO_MAX_OPERACION) + ', en múltiplos de ' + moneda(REGLAS.RETIRO_MULTIPLO) + '.', 'Retiro de efectivo');
  }

  function vistaDepositoTipo() {
    return {
      centro: '<div class="centro">' + cabecera('Depósito a otra cuenta', '¿Cómo identificará la cuenta destino?') +
        '<p class="nota">El depósito se carga a su cuenta y el beneficiario lo recibe de inmediato.</p>' +
        indicacion('Seleccione una opción con los botones laterales.') + '</div>',
      izq: [op('CLABE interbancaria<small>18 dígitos, cualquier banco</small>', 'data-accion="tipo-destino" data-tipo="CLABE"'), null, null, op('Regresar', 'data-accion="ir" data-vista="menu"', 'opcion--peligro')],
      der: [op('Número de tarjeta<small>16 dígitos</small>', 'data-accion="tipo-destino" data-tipo="Tarjeta"', 'opcion--der'), null, null, null]
    };
  }

  function vistaDepositoCuenta() {
    var esClabe = ui.tipoDestino === 'CLABE';
    var largo = esClabe ? 18 : 16;
    var banco = '';
    if (esClabe && ui.entrada.length >= 3) {
      banco = Validaciones.BANCOS[ui.entrada.slice(0, 3)] || 'Institución no reconocida';
    }
    var ayuda = Banco.CUENTAS_PRUEBA.filter(function (c) { return c.tipo === ui.tipoDestino; }).map(function (c) {
      return '<li><button type="button" class="enlace" data-accion="llenar" data-numero="' + c.numero + '">' + Validaciones.agruparDigitos(c.numero) + '</button> · ' + c.banco + '</li>';
    }).join('');
    return {
      centro: '<div class="centro">' + cabecera('Escriba la ' + (esClabe ? 'CLABE' : 'tarjeta') + ' destino', largo + ' dígitos.', 'Depósito a otra cuenta') +
        '<p class="captura captura--cuenta' + (ui.entrada ? '' : ' captura--vacia') + '">' + (ui.entrada ? Validaciones.agruparDigitos(ui.entrada) : '0000 0000 0000 0000' + (esClabe ? ' 00' : '')) + '</p>' +
        '<p class="nota">' + ui.entrada.length + ' de ' + largo + ' dígitos' + (banco ? ' · ' + banco : '') + '</p>' +
        mensajeError() +
        '<details class="ayuda"><summary>Cuentas de prueba para la demostración</summary><ul>' + ayuda + '</ul></details>' +
        '</div>',
      izq: [null, null, null, op('Cancelar', 'data-accion="cancelar"', 'opcion--peligro')],
      der: [null, null, null, op('Continuar', 'data-accion="aceptar"', 'opcion--der opcion--primaria', ui.entrada.length !== largo)]
    };
  }

  function vistaDepositoMonto() {
    var d = ui.destino;
    return vistaMonto('Escriba el monto a depositar', 'Destino: ' + d.tipo + ' ' + Validaciones.agruparDigitos(d.numero) + ' (' + d.banco + ')',
      'Hasta ' + moneda(REGLAS.DEPOSITO_MAX_OPERACION) + ' por operación. Se cargará a su cuenta.', 'Depósito a otra cuenta');
  }

  function vistaConfirmar() {
    var o = ui.operacion;
    var filas = '<tr><th>Operación</th><td>' + (o.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') + '</td></tr>' +
      '<tr><th>Monto</th><td>' + moneda(o.monto) + '</td></tr>';
    if (o.tipo === 'deposito') {
      filas += '<tr><th>Destino</th><td>' + ui.destino.tipo + ' ' + Validaciones.agruparDigitos(ui.destino.numero) + '<br><small>' + ui.destino.banco + '</small></td></tr>';
    }
    filas += '<tr><th>Cargo a</th><td>Cuenta terminación ' + Banco.CUENTA.numero.slice(-4) + '</td></tr>';
    return {
      centro: '<div class="centro">' + cabecera('Confirme la operación', 'Revise los datos antes de continuar.', o.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') +
        '<table class="resumen"><tbody>' + filas + '</tbody></table>' +
        indicacion('¿Son correctos los datos?') + '</div>',
      izq: [null, null, null, op('No, cancelar', 'data-accion="cancelar"', 'opcion--peligro')],
      der: [null, null, null, op('Sí, confirmar', 'data-accion="aceptar"', 'opcion--der opcion--primaria')]
    };
  }

  function vistaProcesando() {
    var texto = ui.operacion && ui.operacion.tipo === 'retiro' ? 'Contando billetes...' : 'Enviando el depósito...';
    return {
      centro: '<div class="centro centro--medio" aria-busy="true"><div class="spinner" aria-hidden="true"></div><h1 class="pantalla__titulo">Procesando</h1><p class="nota">' + texto + '</p></div>',
      izq: [null, null, null, null],
      der: [null, null, null, null]
    };
  }

  function vistaComprobante() {
    var r = ui.resultado;
    var o = ui.operacion;
    var filas = '<tr><th>Folio</th><td>' + r.folio + '</td></tr>' +
      '<tr><th>Fecha</th><td>' + fechaLarga(r.fecha) + '</td></tr>' +
      '<tr><th>Cuenta</th><td>**** ' + Banco.CUENTA.numero.slice(-4) + '</td></tr>' +
      '<tr><th>Operación</th><td>' + (o.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') + '</td></tr>';
    if (o.tipo === 'deposito') {
      filas += '<tr><th>Destino</th><td>' + ui.destino.tipo + ' **** ' + ui.destino.numero.slice(-4) + '</td></tr>' +
        '<tr><th>Banco</th><td>' + r.banco + '</td></tr>';
    }
    filas += '<tr><th>Monto</th><td>' + moneda(o.monto) + '</td></tr>' +
      '<tr><th>Saldo anterior</th><td>' + moneda(r.saldoAnterior) + '</td></tr>' +
      '<tr class="ticket__total"><th>Saldo actual</th><td>' + moneda(r.saldoNuevo) + '</td></tr>';
    var billetes = '';
    if (o.tipo === 'retiro') {
      billetes = '<p class="billetes">Retire su efectivo: ' + r.billetes.map(function (b) {
        return b.cantidad + ' × $' + b.denominacion;
      }).join(', ') + '</p>';
    }
    return {
      centro: '<div class="centro">' + cabecera('Operación exitosa', o.tipo === 'retiro' ? 'Tome su efectivo y su comprobante.' : 'Tome su comprobante.') +
        billetes +
        '<div class="ticket resumen--ticket"><p class="ticket__cabecera">' + Banco.CUENTA.banco.toUpperCase() + '</p><p class="ticket__sub">Sucursal Centro · Terminal 0412</p>' +
        '<table><tbody>' + filas + '</tbody></table><p class="ticket__pie">Conserve este comprobante</p></div></div>',
      izq: [null, null, null, op('Salir', 'data-accion="salir"', 'opcion--peligro')],
      der: [null, null, null, op('Otra operación', 'data-accion="ir" data-vista="menu"', 'opcion--der opcion--primaria')]
    };
  }

  function vistaBloqueada() {
    return {
      centro: '<div class="centro centro--medio">' + cabecera('Tarjeta retenida', 'Se agotaron los intentos para ingresar el NIP.') +
        '<p class="alerta" role="alert">Por su seguridad la tarjeta fue bloqueada. Acuda a su sucursal o llame al centro de atención para desbloquearla.</p>' +
        '<p class="nota">Atención a clientes: 800 000 0000 (simulado)</p></div>',
      izq: [null, null, null, op('Restablecer demostración', 'data-accion="restablecer"', 'opcion--suave')],
      der: [null, null, null, null]
    };
  }

  function vistaDespedida() {
    return {
      centro: '<div class="centro centro--medio">' + LOGO + cabecera('Gracias por su visita', 'No olvide retirar su tarjeta.') +
        (ui.motivoSalida ? '<p class="alerta" role="alert">' + ui.motivoSalida + '</p>' : '') + '</div>',
      izq: [null, null, null, null],
      der: [null, null, null, op('Terminar', 'data-accion="ir" data-vista="bienvenida"', 'opcion--der opcion--primaria')]
    };
  }

  var VISTAS = {
    'bienvenida': vistaBienvenida,
    'nip': vistaNip,
    'menu': vistaMenu,
    'saldo': vistaSaldo,
    'retiro': vistaRetiro,
    'retiro-monto': vistaRetiroMonto,
    'deposito-tipo': vistaDepositoTipo,
    'deposito-cuenta': vistaDepositoCuenta,
    'deposito-monto': vistaDepositoMonto,
    'confirmar': vistaConfirmar,
    'procesando': vistaProcesando,
    'comprobante': vistaComprobante,
    'bloqueada': vistaBloqueada,
    'despedida': vistaDespedida
  };

  function columna(lado, opciones) {
    var html = '<div class="columna columna--' + lado + '">';
    for (var i = 0; i < 4; i++) {
      var slot = (lado === 'izq' ? 'L' : 'R') + (i + 1);
      if (opciones[i]) {
        html += opciones[i].replace('class="opcion', 'data-slot="' + slot + '" class="opcion');
      } else {
        html += '<span class="opcion-vacia" data-slot="' + slot + '"></span>';
      }
    }
    return html + '</div>';
  }

  /** Dibuja la vista actual. enfocar: true solo al cambiar de pantalla, para no mover el foco en cada dígito. */
  function render(enfocar) {
    var v = VISTAS[ui.vista]();
    $cuerpo.innerHTML = columna('izq', v.izq) + v.centro + columna('der', v.der);
    $cuerpo.dataset.vista = ui.vista;
    ajustarEscala();
    Array.prototype.forEach.call($teclado.querySelectorAll('[data-tecla]'), function (b) {
      var t = b.dataset.tecla;
      if (t === 'cancelar') b.disabled = ['bienvenida', 'despedida', 'bloqueada', 'procesando'].indexOf(ui.vista) !== -1;
      else if (t === 'aceptar') b.disabled = ['bloqueada', 'procesando', 'menu', 'retiro', 'deposito-tipo'].indexOf(ui.vista) !== -1;
      else b.disabled = !ui.campo;
    });
    // El foco se mueve a la acción principal solo si la persona navega con teclado; con mouse o
    // pantalla táctil no se dibuja el anillo de foco porque no aporta y ensucia el diseño.
    if (!usaTeclado || !enfocar) return;
    var foco = $cuerpo.querySelector('.opcion--primaria:not([disabled])') || $cuerpo.querySelector('.opcion:not([disabled])');
    if (foco) foco.focus({ preventScroll: true });
  }

  /**
   * Coloca cada botón físico lateral a la altura exacta del renglón de opción que le corresponde.
   * Se recalcula en cada render y al cambiar el tamaño de la ventana, porque la pantalla crece
   * con el contenido (por ejemplo, con el comprobante).
   */
  function alinearSoftkeys() {
    Array.prototype.forEach.call(document.querySelectorAll('.softkey'), function (boton) {
      var slot = $cuerpo.querySelector('[data-slot="' + boton.dataset.slot + '"]');
      var contenedor = boton.parentNode;
      if (!slot || !contenedor.offsetParent) return;
      var rs = slot.getBoundingClientRect();
      var rc = contenedor.getBoundingClientRect();
      // Las medidas vienen en píxeles de pantalla (ya escalados); se convierten a píxeles de diseño.
      boton.style.top = Math.round((rs.top - rc.top) / escala + (rs.height / escala) / 2 - boton.offsetHeight / 2) + 'px';
    });
  }

  /**
   * Reduce la carcasa completa si no cabe en la ventana, para que la pantalla, los botones
   * laterales y el teclado se vean siempre sin desplazarse. En móvil no aplica (ahí se apila).
   */
  function ajustarEscala() {
    var atm = document.querySelector('.atm');
    if (window.innerWidth <= 900) {
      atm.style.transform = '';
      atm.style.marginBottom = '';
      escala = 1;
      return;
    }
    atm.style.transform = 'none';
    atm.style.marginBottom = '0';
    var alto = atm.offsetHeight;
    var ancho = atm.offsetWidth;
    escala = Math.min(1, (window.innerHeight - 32) / alto, (window.innerWidth - 32) / ancho);
    atm.style.transform = 'scale(' + escala + ')';
    atm.style.marginBottom = Math.round(-alto * (1 - escala)) + 'px';
    alinearSoftkeys();
  }

  // ---------------------------------------------------------------- Eventos

  function presionarSoftkey(boton) {
    var slot = boton.dataset.slot;
    var objetivo = $cuerpo.querySelector('.opcion[data-slot="' + slot + '"]');
    boton.classList.add('softkey--presionado');
    setTimeout(function () { boton.classList.remove('softkey--presionado'); }, 120);
    if (objetivo && !objetivo.disabled) objetivo.click();
  }

  function alHacerClic(ev) {
    var softkey = ev.target.closest('.softkey');
    if (softkey) { presionarSoftkey(softkey); return; }
    var el = ev.target.closest('[data-accion], [data-tecla]');
    if (!el || el.disabled) return;
    if (el.dataset.tecla) {
      var t = el.dataset.tecla;
      if (t === 'borrar') teclaBorrar();
      else if (t === 'cancelar') teclaCancelar();
      else if (t === 'aceptar') teclaAceptar();
      else teclaDigito(t);
      return;
    }
    switch (el.dataset.accion) {
      case 'insertar': insertarTarjeta(); break;
      case 'aceptar': teclaAceptar(); break;
      case 'cancelar': teclaCancelar(); break;
      case 'ir': ir(el.dataset.vista); break;
      case 'salir': cerrarSesion(''); break;
      case 'monto-retiro': elegirMontoRetiro(Number(el.dataset.monto)); break;
      case 'tipo-destino': elegirTipoDestino(el.dataset.tipo); break;
      case 'llenar':
        ui.entrada = el.dataset.numero;
        ui.error = '';
        render();
        break;
      case 'restablecer':
        if (window.confirm('Se restablecerán el saldo, los movimientos y el bloqueo de la demostración. ¿Continuar?')) {
          Banco.restablecer();
          ir('bienvenida');
        }
        break;
      case 'continuar':
        reiniciarInactividad();
        break;
      default: break;
    }
  }

  function alTeclear(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (/^[0-9]$/.test(ev.key)) {
      if (ui.campo) { ev.preventDefault(); teclaDigito(ev.key); }
    } else if (ev.key === 'Backspace') {
      if (ui.campo) { ev.preventDefault(); teclaBorrar(); }
    } else if (ev.key === 'Enter') {
      if (ev.target.tagName !== 'BUTTON' && ev.target.tagName !== 'SUMMARY') { ev.preventDefault(); teclaAceptar(); }
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      if (!$modal.hidden) reiniciarInactividad(); else teclaCancelar();
    }
  }

  function actividad() {
    if ((ui.sesion || ui.vista === 'nip') && ui.vista !== 'procesando') reiniciarInactividad();
  }

  function reloj() {
    $reloj.textContent = fechaLarga(Date.now());
  }

  function iniciar() {
    $cuerpo = document.getElementById('pantalla-cuerpo');
    $teclado = document.getElementById('teclado');
    $reloj = document.getElementById('reloj');
    $modal = document.getElementById('modal-inactividad');
    $modalSegundos = document.getElementById('modal-segundos');
    $ranuraEfectivo = document.getElementById('ranura-efectivo');
    $ranuraTarjeta = document.getElementById('ranura-tarjeta');

    document.addEventListener('click', alHacerClic);
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('keydown', function () { usaTeclado = true; }, true);
    document.addEventListener('pointerdown', function () { usaTeclado = false; }, true);
    document.addEventListener('click', actividad, true);
    document.addEventListener('keydown', actividad, true);

    window.addEventListener('resize', ajustarEscala);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarEscala);

    reloj();
    setInterval(reloj, 1000);
    render();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
