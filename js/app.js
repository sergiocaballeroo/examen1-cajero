/*
 * Controlador de la interfaz del cajero.
 * Es una máquina de estados: cada "vista" se dibuja completa en #pantalla y el teclado
 * numérico de la derecha escribe en el campo activo de esa vista (NIP, monto o cuenta).
 * Toda la lógica bancaria vive en banco.js; aquí solo hay presentación y flujo.
 */
(function () {
  'use strict';

  var REGLAS = Banco.REGLAS;
  var moneda = Validaciones.moneda;

  var $pantalla, $teclado, $reloj, $btnSalir, $modal, $modalSegundos;

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
    render();
  }

  // ---------------------------------------------------------------- Sesión e inactividad

  function iniciarSesion() {
    ui.sesion = true;
    $btnSalir.hidden = false;
    reiniciarInactividad();
    ir('menu');
  }

  function cerrarSesion(motivo) {
    ui.sesion = false;
    ui.destino = null;
    ui.operacion = null;
    ui.resultado = null;
    $btnSalir.hidden = true;
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
      }
      reiniciarInactividad();
    }, 1800);
  }

  // ---------------------------------------------------------------- Vistas (HTML)

  /** Iconos en SVG (trazo de 2 px) para que el menú no dependa de tipografías ni emojis. */
  var ICONOS = {
    saldo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>',
    retiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 11v3M18 11v3"/></svg>',
    deposito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h12"/><path d="M12 7l5 5-5 5"/><path d="M20 5v14"/></svg>',
    salir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M14 8l4 4-4 4"/><path d="M8 12h10"/></svg>',
    cuenta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>'
  };

  function cabecera(titulo, subtitulo, eyebrow) {
    return (eyebrow ? '<p class="pantalla__eyebrow">' + eyebrow + '</p>' : '') +
      '<h1 class="pantalla__titulo">' + titulo + '</h1>' +
      (subtitulo ? '<p class="pantalla__sub">' + subtitulo + '</p>' : '');
  }

  function mensajeError() {
    return ui.error ? '<p class="alerta" role="alert">' + ui.error + '</p>' : '';
  }

  function tarjetaCuenta() {
    return '<p class="cuenta-chip">' + ICONOS.cuenta + '<span>Cuenta terminación ' + Banco.CUENTA.numero.slice(-4) + ' · ' + Banco.CUENTA.titular + '</span></p>';
  }

  function vistaBienvenida() {
    var t = Banco.CUENTA.tarjeta;
    return cabecera('Bienvenido a ' + Banco.CUENTA.banco, 'Inserte su tarjeta para comenzar.') +
      '<div class="centro">' +
      '<div class="tarjeta-banco" aria-hidden="true">' +
      '<span class="tarjeta-banco__marca">' + Banco.CUENTA.banco + '</span>' +
      '<div class="tarjeta-banco__chip"></div>' +
      '<div class="tarjeta-banco__numero">•••• •••• •••• ' + t.slice(-4) + '</div>' +
      '<div class="tarjeta-banco__pie"><span>' + Banco.CUENTA.titular + '</span><span>Débito</span></div>' +
      '</div>' +
      '<button class="btn btn--primario btn--grande" data-accion="insertar">Insertar tarjeta</button>' +
      '<p class="nota">Simulación académica. Cuenta de prueba con NIP 8420.</p>' +
      '</div>' +
      '<p class="pie-pantalla"><button class="enlace" data-accion="restablecer">Restablecer demostración</button></p>';
  }

  function vistaNip() {
    var puntos = '';
    for (var i = 0; i < 4; i++) {
      puntos += '<span class="nip__caja' + (i < ui.entrada.length ? ' nip__caja--lleno' : '') + '">' + (i < ui.entrada.length ? '●' : '') + '</span>';
    }
    return cabecera('Ingrese su NIP', 'Use el teclado numérico. Nadie debe ver su NIP.') +
      '<div class="centro">' +
      '<div class="nip" aria-label="NIP capturado: ' + ui.entrada.length + ' de 4 dígitos">' + puntos + '</div>' +
      mensajeError() +
      '<p class="nota">Intentos disponibles: ' + Banco.intentosRestantes() + '</p>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="cancelar">Cancelar</button>' +
      '<button class="btn btn--primario" data-accion="aceptar"' + (ui.entrada.length < 4 ? ' disabled' : '') + '>Aceptar</button>' +
      '</div></div>';
  }

  function vistaMenu() {
    return cabecera('¿Qué operación desea realizar?', '') + tarjetaCuenta() + mensajeError() +
      '<div class="menu">' +
      '<button class="btn btn--tile" data-accion="ir" data-vista="saldo"><span class="tile__icono">' + ICONOS.saldo + '</span>Consulta de saldo<small>Saldo disponible y últimos movimientos</small></button>' +
      '<button class="btn btn--tile" data-accion="ir" data-vista="retiro"><span class="tile__icono">' + ICONOS.retiro + '</span>Retiro de efectivo<small>Billetes de 100, 200 y 500</small></button>' +
      '<button class="btn btn--tile" data-accion="ir" data-vista="deposito-tipo"><span class="tile__icono">' + ICONOS.deposito + '</span>Depósito a otra cuenta<small>Por CLABE o número de tarjeta</small></button>' +
      '<button class="btn btn--tile btn--tile-salir" data-accion="salir"><span class="tile__icono">' + ICONOS.salir + '</span>Salir<small>Terminar sesión y retirar tarjeta</small></button>' +
      '</div>';
  }

  function vistaSaldo() {
    var s = Banco.consultarSaldo();
    var filas = s.movimientos.map(function (m) {
      return '<tr><td>' + fechaCorta(m.fecha) + '</td><td>' + m.tipo + '</td><td class="num ' + (m.monto < 0 ? 'neg' : 'pos') + '">' + moneda(m.monto) + '</td></tr>';
    }).join('');
    return cabecera('Su saldo', '', 'Consulta de saldo') + tarjetaCuenta() +
      '<div class="saldo">' +
      '<p class="saldo__etiqueta">Saldo disponible</p>' +
      '<p class="saldo__monto">' + moneda(s.saldo) + '</p>' +
      '<p class="nota">Disponible para retirar hoy en cajero: ' + moneda(s.disponibleHoy) + '</p>' +
      '</div>' +
      '<h2 class="pantalla__h2">Últimos movimientos</h2>' +
      '<div class="tabla-scroll"><table class="movimientos"><tbody>' + filas + '</tbody></table></div>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="salir">Salir</button>' +
      '<button class="btn btn--primario" data-accion="ir" data-vista="menu">Otra operación</button>' +
      '</div>';
  }

  function vistaRetiro() {
    var botones = REGLAS.MONTOS_RAPIDOS.map(function (m) {
      return '<button class="btn btn--monto" data-accion="monto-retiro" data-monto="' + m + '">' + moneda(m) + '</button>';
    }).join('');
    return cabecera('¿Cuánto desea retirar?', 'Elija un monto o escriba otro.', 'Retiro de efectivo') + mensajeError() +
      '<div class="montos">' + botones +
      '<button class="btn btn--monto btn--monto-otro" data-accion="ir" data-vista="retiro-monto">Otro monto</button>' +
      '</div>' +
      '<p class="nota">Múltiplos de ' + moneda(REGLAS.RETIRO_MULTIPLO) + '. Máximo ' + moneda(REGLAS.RETIRO_MAX_OPERACION) + ' por operación y ' + moneda(REGLAS.RETIRO_MAX_DIARIO) + ' al día.</p>' +
      '<div class="acciones"><button class="btn btn--secundario" data-accion="ir" data-vista="menu">Regresar</button></div>';
  }

  function vistaMonto(titulo, ayuda, maximo, eyebrow) {
    var monto = montoCapturado();
    return cabecera(titulo, ayuda, eyebrow) +
      '<div class="centro">' +
      '<p class="captura' + (ui.entrada ? '' : ' captura--vacia') + '" aria-live="off">' + (ui.entrada ? moneda(monto) : '$ 0.00') + '</p>' +
      mensajeError() +
      '<p class="nota">' + maximo + '</p>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="cancelar">Cancelar</button>' +
      '<button class="btn btn--primario" data-accion="aceptar"' + (ui.entrada ? '' : ' disabled') + '>Continuar</button>' +
      '</div></div>';
  }

  function vistaRetiroMonto() {
    return vistaMonto('Escriba el monto a retirar', 'Solo billetes de 100, 200 y 500.',
      'Entre ' + moneda(REGLAS.RETIRO_MIN) + ' y ' + moneda(REGLAS.RETIRO_MAX_OPERACION) + ', en múltiplos de ' + moneda(REGLAS.RETIRO_MULTIPLO) + '.', 'Retiro de efectivo');
  }

  function vistaDepositoTipo() {
    return cabecera('¿Cómo identificará la cuenta destino?', 'Elija el tipo de número que tiene a la mano.', 'Depósito a otra cuenta') +
      '<div class="menu menu--dos">' +
      '<button class="btn btn--tile" data-accion="tipo-destino" data-tipo="CLABE"><span class="tile__icono">18</span>CLABE interbancaria<small>18 dígitos, cualquier banco</small></button>' +
      '<button class="btn btn--tile" data-accion="tipo-destino" data-tipo="Tarjeta"><span class="tile__icono">16</span>Número de tarjeta<small>16 dígitos</small></button>' +
      '</div>' +
      '<p class="nota">El depósito se carga a su cuenta. El beneficiario lo recibe de inmediato.</p>' +
      '<div class="acciones"><button class="btn btn--secundario" data-accion="ir" data-vista="menu">Regresar</button></div>';
  }

  function vistaDepositoCuenta() {
    var esClabe = ui.tipoDestino === 'CLABE';
    var largo = esClabe ? 18 : 16;
    var banco = '';
    if (esClabe && ui.entrada.length >= 3) {
      banco = Validaciones.BANCOS[ui.entrada.slice(0, 3)] || 'Institución no reconocida';
    }
    var ayuda = Banco.CUENTAS_PRUEBA.filter(function (c) { return c.tipo === ui.tipoDestino; }).map(function (c) {
      return '<li><button class="enlace" data-accion="llenar" data-numero="' + c.numero + '">' + Validaciones.agruparDigitos(c.numero) + '</button> · ' + c.banco + '</li>';
    }).join('');
    return cabecera('Escriba la ' + (esClabe ? 'CLABE' : 'tarjeta') + ' destino', largo + ' dígitos.', 'Depósito a otra cuenta') +
      '<div class="centro">' +
      '<p class="captura captura--cuenta' + (ui.entrada ? '' : ' captura--vacia') + '">' + (ui.entrada ? Validaciones.agruparDigitos(ui.entrada) : '0000 0000 0000 0000' + (esClabe ? ' 00' : '')) + '</p>' +
      '<p class="nota">' + ui.entrada.length + ' de ' + largo + ' dígitos' + (banco ? ' · ' + banco : '') + '</p>' +
      mensajeError() +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="cancelar">Cancelar</button>' +
      '<button class="btn btn--primario" data-accion="aceptar"' + (ui.entrada.length === largo ? '' : ' disabled') + '>Continuar</button>' +
      '</div>' +
      '<details class="ayuda"><summary>Cuentas de prueba para la demostración</summary><ul>' + ayuda + '</ul></details>' +
      '</div>';
  }

  function vistaDepositoMonto() {
    var d = ui.destino;
    return cabecera('¿Cuánto desea depositar?', 'Destino: ' + d.tipo + ' ' + Validaciones.agruparDigitos(d.numero) + ' (' + d.banco + ')', 'Depósito a otra cuenta') +
      '<div class="centro">' +
      '<p class="captura' + (ui.entrada ? '' : ' captura--vacia') + '">' + (ui.entrada ? moneda(montoCapturado()) : '$ 0.00') + '</p>' +
      mensajeError() +
      '<p class="nota">Hasta ' + moneda(REGLAS.DEPOSITO_MAX_OPERACION) + ' por operación. Se cargará a su cuenta.</p>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="cancelar">Cancelar</button>' +
      '<button class="btn btn--primario" data-accion="aceptar"' + (ui.entrada ? '' : ' disabled') + '>Continuar</button>' +
      '</div></div>';
  }

  function vistaConfirmar() {
    var op = ui.operacion;
    var filas = '<tr><th>Operación</th><td>' + (op.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') + '</td></tr>' +
      '<tr><th>Monto</th><td class="num">' + moneda(op.monto) + '</td></tr>';
    if (op.tipo === 'deposito') {
      filas += '<tr><th>Destino</th><td>' + ui.destino.tipo + ' ' + Validaciones.agruparDigitos(ui.destino.numero) + '<br><small>' + ui.destino.banco + '</small></td></tr>';
    }
    filas += '<tr><th>Cargo a</th><td>Cuenta terminación ' + Banco.CUENTA.numero.slice(-4) + '</td></tr>';
    return cabecera('Confirme la operación', 'Revise los datos antes de continuar.', op.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') +
      '<table class="resumen"><tbody>' + filas + '</tbody></table>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="cancelar">Cancelar</button>' +
      '<button class="btn btn--confirmar" data-accion="aceptar">Confirmar</button>' +
      '</div>';
  }

  function vistaProcesando() {
    var texto = ui.operacion && ui.operacion.tipo === 'retiro' ? 'Contando billetes...' : 'Enviando el depósito...';
    return '<div class="centro procesando" aria-busy="true"><div class="spinner" aria-hidden="true"></div><p class="pantalla__titulo">Procesando</p><p class="nota">' + texto + '</p></div>';
  }

  function vistaComprobante() {
    var r = ui.resultado;
    var op = ui.operacion;
    var filas = '<tr><th>Folio</th><td>' + r.folio + '</td></tr>' +
      '<tr><th>Fecha</th><td>' + fechaLarga(r.fecha) + '</td></tr>' +
      '<tr><th>Operación</th><td>' + (op.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') + '</td></tr>';
    if (op.tipo === 'deposito') {
      filas += '<tr><th>Destino</th><td>' + ui.destino.tipo + ' terminación ' + ui.destino.numero.slice(-4) + ' (' + r.banco + ')</td></tr>';
    }
    filas += '<tr><th>Monto</th><td class="num">' + moneda(op.monto) + '</td></tr>' +
      '<tr><th>Saldo anterior</th><td class="num">' + moneda(r.saldoAnterior) + '</td></tr>' +
      '<tr><th>Saldo actual</th><td class="num"><strong>' + moneda(r.saldoNuevo) + '</strong></td></tr>';
    var billetes = '';
    if (op.tipo === 'retiro') {
      billetes = '<p class="billetes">Retire su efectivo: ' + r.billetes.map(function (b) {
        return b.cantidad + ' × $' + b.denominacion;
      }).join(', ') + '</p>';
    }
    return cabecera('Operación exitosa', 'Conserve su comprobante.', op.tipo === 'retiro' ? 'Retiro de efectivo' : 'Depósito a otra cuenta') +
      billetes +
      '<table class="resumen resumen--ticket"><tbody>' + filas + '</tbody></table>' +
      '<div class="acciones">' +
      '<button class="btn btn--secundario" data-accion="salir">Salir</button>' +
      '<button class="btn btn--primario" data-accion="ir" data-vista="menu">Otra operación</button>' +
      '</div>';
  }

  function vistaBloqueada() {
    return cabecera('Tarjeta retenida', 'Se agotaron los intentos para ingresar el NIP.') +
      '<div class="centro">' +
      '<p class="alerta" role="alert">Por su seguridad la tarjeta fue bloqueada. Acuda a su sucursal o llame al centro de atención para desbloquearla.</p>' +
      '<p class="nota">Centro de atención: 55 0000 0000 (simulado)</p>' +
      '</div>' +
      '<p class="pie-pantalla"><button class="enlace" data-accion="restablecer">Restablecer demostración</button></p>';
  }

  function vistaDespedida() {
    return cabecera('Gracias por su visita', 'No olvide retirar su tarjeta.') +
      '<div class="centro">' +
      (ui.motivoSalida ? '<p class="alerta" role="alert">' + ui.motivoSalida + '</p>' : '') +
      '<button class="btn btn--primario" data-accion="ir" data-vista="bienvenida">Terminar</button>' +
      '</div>';
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

  function render() {
    $pantalla.innerHTML = VISTAS[ui.vista]();
    $pantalla.dataset.vista = ui.vista;
    $teclado.classList.toggle('teclado--inactivo', !ui.campo);
    Array.prototype.forEach.call($teclado.querySelectorAll('[data-tecla]'), function (b) {
      var t = b.dataset.tecla;
      if (t === 'cancelar') b.disabled = ['bienvenida', 'despedida', 'bloqueada', 'procesando'].indexOf(ui.vista) !== -1;
      else if (t === 'aceptar') b.disabled = ['despedida', 'bloqueada', 'procesando', 'menu', 'retiro', 'deposito-tipo'].indexOf(ui.vista) !== -1;
      else b.disabled = !ui.campo;
    });
    // El foco se mueve a la acción principal solo si la persona navega con teclado; con mouse o
    // pantalla táctil no se dibuja el anillo de foco porque no aporta y ensucia el diseño.
    if (!usaTeclado) return;
    var foco = $pantalla.querySelector('[autofocus], .btn--primario:not([disabled]), .btn--confirmar, .btn--tile');
    if (foco) foco.focus({ preventScroll: true });
  }

  var usaTeclado = false;

  // ---------------------------------------------------------------- Eventos

  function alHacerClic(ev) {
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
    $pantalla = document.getElementById('pantalla');
    $teclado = document.getElementById('teclado');
    $reloj = document.getElementById('reloj');
    $btnSalir = document.getElementById('btn-salir');
    $modal = document.getElementById('modal-inactividad');
    $modalSegundos = document.getElementById('modal-segundos');

    document.addEventListener('click', alHacerClic);
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('keydown', function () { usaTeclado = true; }, true);
    document.addEventListener('pointerdown', function () { usaTeclado = false; }, true);
    document.addEventListener('click', actividad, true);
    document.addEventListener('keydown', actividad, true);
    $btnSalir.addEventListener('click', function () { cerrarSesion(''); });

    reloj();
    setInterval(reloj, 1000);
    render();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
