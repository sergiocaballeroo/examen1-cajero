/*
 * Modelo de datos y reglas de negocio del cajero (simulación).
 * El estado se guarda en localStorage para que el saldo y los movimientos sobrevivan
 * a recargas de la página, como lo haría la cuenta real en el servidor del banco.
 *
 * Nota: en un cajero real el NIP nunca se valida en el cliente; se envía cifrado al
 * autorizador del banco. Aquí se compara localmente porque el examen fija el NIP 8420
 * y la aplicación no tiene servidor.
 */
(function (global) {
  'use strict';

  var CLAVE_ALMACEN = 'examen1-cajero-v1';

  /** Parámetros operativos, tomados de prácticas comunes en cajeros de bancos mexicanos. */
  var REGLAS = {
    NIP: '8420',
    INTENTOS_MAX: 3,
    RETIRO_MULTIPLO: 100,      // el dispensador solo tiene billetes de 100, 200 y 500
    RETIRO_MIN: 100,
    RETIRO_MAX_OPERACION: 6000,
    RETIRO_MAX_DIARIO: 9000,
    DEPOSITO_MIN: 1,
    DEPOSITO_MAX_OPERACION: 20000,
    INACTIVIDAD_SEG: 60,       // segundos sin actividad antes de cerrar la sesión
    AVISO_SEG: 15,             // segundos de aviso antes del cierre
    MONTOS_RAPIDOS: [200, 500, 1000, 2000, 3000, 5000]
  };

  /** Cuenta del titular (datos simulados). CLABE y tarjeta tienen dígito verificador válido. */
  var CUENTA = {
    titular: 'SERGIO JAIR CABALLERO MARTINEZ',
    banco: 'Banco Meridiano',
    numero: '0123456789',
    clabe: '012180001234567899',
    tarjeta: '4152313412344827'
  };

  /** Cuentas de otros clientes para probar el depósito (todas con dígito verificador válido). */
  var CUENTAS_PRUEBA = [
    { tipo: 'CLABE', numero: '072180009876543213', banco: 'Banorte' },
    { tipo: 'CLABE', numero: '014180005555666677', banco: 'Santander' },
    { tipo: 'CLABE', numero: '002180001122334458', banco: 'Citibanamex' },
    { tipo: 'Tarjeta', numero: '5471234567890128', banco: 'Mastercard' },
    { tipo: 'Tarjeta', numero: '4024000012345678', banco: 'Visa' }
  ];

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function estadoInicial() {
    var ahora = Date.now();
    var dia = 86400000;
    return {
      saldo: 12500.00,
      intentosFallidos: 0,
      bloqueada: false,
      retirosHoy: { fecha: hoy(), total: 0 },
      folio: 1000,
      movimientos: [
        { fecha: ahora - 6 * dia, tipo: 'Depósito de nómina', monto: 9800.00 },
        { fecha: ahora - 4 * dia, tipo: 'Retiro en cajero', monto: -1500.00 },
        { fecha: ahora - 2 * dia, tipo: 'Compra con tarjeta', monto: -649.50 },
        { fecha: ahora - 1 * dia, tipo: 'Transferencia recibida', monto: 4849.50 }
      ]
    };
  }

  function cargar() {
    try {
      var crudo = global.localStorage.getItem(CLAVE_ALMACEN);
      if (crudo) {
        var guardado = JSON.parse(crudo);
        // Si cambió el día, el acumulado diario de retiros vuelve a cero.
        if (!guardado.retirosHoy || guardado.retirosHoy.fecha !== hoy()) {
          guardado.retirosHoy = { fecha: hoy(), total: 0 };
        }
        return guardado;
      }
    } catch (e) { /* almacenamiento no disponible: se trabaja en memoria */ }
    return estadoInicial();
  }

  var estado = cargar();

  function guardar() {
    try {
      global.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(estado));
    } catch (e) { /* sin persistencia */ }
  }

  function restablecer() {
    estado = estadoInicial();
    guardar();
  }

  function redondear(n) {
    return Math.round(n * 100) / 100;
  }

  function registrar(tipo, monto, detalle) {
    estado.folio += 1;
    var mov = { fecha: Date.now(), tipo: tipo, monto: monto, folio: estado.folio, detalle: detalle || '' };
    estado.movimientos.push(mov);
    if (estado.movimientos.length > 50) estado.movimientos.shift();
    guardar();
    return mov;
  }

  // ---------------------------------------------------------------- Ingreso al sistema

  function validarNip(nip) {
    if (estado.bloqueada) {
      return { ok: false, bloqueada: true, restantes: 0 };
    }
    if (nip === REGLAS.NIP) {
      estado.intentosFallidos = 0;
      guardar();
      return { ok: true };
    }
    estado.intentosFallidos += 1;
    var restantes = REGLAS.INTENTOS_MAX - estado.intentosFallidos;
    if (restantes <= 0) {
      estado.bloqueada = true;
      guardar();
      return { ok: false, bloqueada: true, restantes: 0 };
    }
    guardar();
    return { ok: false, bloqueada: false, restantes: restantes };
  }

  // ---------------------------------------------------------------- Consulta de saldo

  function consultarSaldo() {
    return {
      saldo: estado.saldo,
      disponibleHoy: Math.max(0, Math.min(estado.saldo, REGLAS.RETIRO_MAX_DIARIO - estado.retirosHoy.total)),
      movimientos: estado.movimientos.slice(-5).reverse()
    };
  }

  // ---------------------------------------------------------------- Retiro de efectivo

  function validarRetiro(monto) {
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, mensaje: 'Ingrese un monto.' };
    }
    if (monto < REGLAS.RETIRO_MIN) {
      return { ok: false, mensaje: 'El retiro mínimo es de ' + Validaciones.moneda(REGLAS.RETIRO_MIN) + '.' };
    }
    if (monto % REGLAS.RETIRO_MULTIPLO !== 0) {
      return { ok: false, mensaje: 'El monto debe ser múltiplo de ' + Validaciones.moneda(REGLAS.RETIRO_MULTIPLO) + ' (billetes disponibles: 100, 200 y 500).' };
    }
    if (monto > REGLAS.RETIRO_MAX_OPERACION) {
      return { ok: false, mensaje: 'El máximo por operación es ' + Validaciones.moneda(REGLAS.RETIRO_MAX_OPERACION) + '.' };
    }
    var restanteDia = REGLAS.RETIRO_MAX_DIARIO - estado.retirosHoy.total;
    if (monto > restanteDia) {
      return { ok: false, mensaje: 'Supera su límite diario de retiro. Hoy aún puede retirar ' + Validaciones.moneda(Math.max(0, restanteDia)) + '.' };
    }
    if (monto > estado.saldo) {
      return { ok: false, mensaje: 'Saldo insuficiente. Su saldo disponible es ' + Validaciones.moneda(estado.saldo) + '.' };
    }
    return { ok: true };
  }

  /** Calcula con qué billetes se entrega el monto (mayor denominación primero). */
  function desglosarBilletes(monto) {
    var denominaciones = [500, 200, 100];
    var resto = monto;
    var resultado = [];
    denominaciones.forEach(function (d) {
      var n = Math.floor(resto / d);
      if (n > 0) {
        resultado.push({ denominacion: d, cantidad: n });
        resto -= n * d;
      }
    });
    return resultado;
  }

  function retirar(monto) {
    var v = validarRetiro(monto);
    if (!v.ok) return v;
    var saldoAnterior = estado.saldo;
    estado.saldo = redondear(estado.saldo - monto);
    estado.retirosHoy.total += monto;
    var mov = registrar('Retiro en cajero', -monto);
    return { ok: true, folio: mov.folio, fecha: mov.fecha, saldoAnterior: saldoAnterior, saldoNuevo: estado.saldo, billetes: desglosarBilletes(monto) };
  }

  // ---------------------------------------------------------------- Depósito a otra cuenta

  function validarDestino(tipo, numero) {
    var r = tipo === 'CLABE' ? Validaciones.validarClabe(numero) : Validaciones.validarTarjeta(numero);
    if (!r.valida) return { ok: false, mensaje: r.mensaje };
    if (numero === CUENTA.clabe || numero === CUENTA.tarjeta) {
      return { ok: false, mensaje: 'No puede depositar a su propia cuenta desde esta opción.' };
    }
    return { ok: true, banco: r.banco };
  }

  function validarDeposito(monto) {
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, mensaje: 'Ingrese un monto.' };
    }
    if (monto < REGLAS.DEPOSITO_MIN) {
      return { ok: false, mensaje: 'El depósito mínimo es de ' + Validaciones.moneda(REGLAS.DEPOSITO_MIN) + '.' };
    }
    if (monto > REGLAS.DEPOSITO_MAX_OPERACION) {
      return { ok: false, mensaje: 'El máximo por operación es ' + Validaciones.moneda(REGLAS.DEPOSITO_MAX_OPERACION) + '.' };
    }
    if (monto > estado.saldo) {
      return { ok: false, mensaje: 'Saldo insuficiente. Su saldo disponible es ' + Validaciones.moneda(estado.saldo) + '.' };
    }
    return { ok: true };
  }

  function depositar(tipo, numero, monto) {
    var d = validarDestino(tipo, numero);
    if (!d.ok) return d;
    var v = validarDeposito(monto);
    if (!v.ok) return v;
    var saldoAnterior = estado.saldo;
    estado.saldo = redondear(estado.saldo - monto);
    var mov = registrar('Depósito a otra cuenta', -monto, tipo + ' terminación ' + numero.slice(-4) + ' (' + d.banco + ')');
    return { ok: true, folio: mov.folio, fecha: mov.fecha, saldoAnterior: saldoAnterior, saldoNuevo: estado.saldo, banco: d.banco };
  }

  global.Banco = {
    REGLAS: REGLAS,
    CUENTA: CUENTA,
    CUENTAS_PRUEBA: CUENTAS_PRUEBA,
    estaBloqueada: function () { return estado.bloqueada; },
    intentosRestantes: function () { return REGLAS.INTENTOS_MAX - estado.intentosFallidos; },
    validarNip: validarNip,
    consultarSaldo: consultarSaldo,
    validarRetiro: validarRetiro,
    retirar: retirar,
    validarDestino: validarDestino,
    validarDeposito: validarDeposito,
    depositar: depositar,
    restablecer: restablecer
  };
})(window);
