/*
 * Validaciones de datos bancarios usadas por el cajero.
 * Se cargan como script clásico (sin módulos) para que la aplicación funcione
 * tanto en GitHub Pages como abriendo index.html directamente desde el disco.
 */
(function (global) {
  'use strict';

  /** Catálogo de códigos de institución (3 primeros dígitos de la CLABE), según el catálogo de Banxico. */
  var BANCOS = {
    '002': 'Citibanamex', '006': 'Bancomext', '009': 'Banobras', '012': 'BBVA México',
    '014': 'Santander', '019': 'Banjército', '021': 'HSBC', '030': 'Banco del Bajío',
    '036': 'Inbursa', '042': 'Mifel', '044': 'Scotiabank', '058': 'Banregio',
    '059': 'Invex', '060': 'Bansí', '062': 'Afirme', '072': 'Banorte',
    '106': 'Bank of America', '127': 'Banco Azteca', '130': 'Compartamos', '132': 'Multiva',
    '133': 'Actinver', '136': 'Intercam', '137': 'BanCoppel', '138': 'ABC Capital',
    '140': 'Consubanco', '143': 'CIBanco', '145': 'BBase', '147': 'Bankaool',
    '166': 'Banco del Bienestar', '646': 'STP', '684': 'Transfer', '722': 'Mercado Pago'
  };

  function soloDigitos(texto) {
    return /^\d+$/.test(texto || '');
  }

  /**
   * Dígito verificador de la CLABE interbancaria (18 dígitos).
   * Algoritmo: ponderaciones 3, 7, 1 cíclicas sobre los 17 primeros dígitos; de cada producto
   * se toma el módulo 10, se suman, y el dígito es (10 - suma mod 10) mod 10.
   */
  function digitoClabe(primeros17) {
    var pesos = [3, 7, 1];
    var suma = 0;
    for (var i = 0; i < 17; i++) {
      suma += (Number(primeros17[i]) * pesos[i % 3]) % 10;
    }
    return (10 - (suma % 10)) % 10;
  }

  function validarClabe(clabe) {
    if (!soloDigitos(clabe) || clabe.length !== 18) {
      return { valida: false, mensaje: 'La CLABE debe tener 18 dígitos.' };
    }
    var banco = BANCOS[clabe.slice(0, 3)];
    if (!banco) {
      return { valida: false, mensaje: 'Los primeros tres dígitos no corresponden a una institución reconocida.' };
    }
    if (digitoClabe(clabe.slice(0, 17)) !== Number(clabe[17])) {
      return { valida: false, mensaje: 'El dígito verificador de la CLABE no coincide. Revise el número.' };
    }
    return { valida: true, banco: banco };
  }

  /** Algoritmo de Luhn para números de tarjeta (16 dígitos). */
  function luhnValido(numero) {
    var suma = 0;
    var alterno = false;
    for (var i = numero.length - 1; i >= 0; i--) {
      var n = Number(numero[i]);
      if (alterno) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      suma += n;
      alterno = !alterno;
    }
    return suma % 10 === 0;
  }

  function marcaTarjeta(numero) {
    if (/^4/.test(numero)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(numero)) return 'Mastercard';
    if (/^3[47]/.test(numero)) return 'American Express';
    return 'Tarjeta';
  }

  function validarTarjeta(numero) {
    if (!soloDigitos(numero) || numero.length !== 16) {
      return { valida: false, mensaje: 'El número de tarjeta debe tener 16 dígitos.' };
    }
    if (!luhnValido(numero)) {
      return { valida: false, mensaje: 'El número de tarjeta no es válido. Revise los dígitos.' };
    }
    return { valida: true, banco: marcaTarjeta(numero) };
  }

  /** Agrupa dígitos de 4 en 4 para que sean fáciles de leer en pantalla. */
  function agruparDigitos(texto) {
    return (texto || '').replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  var formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

  function moneda(valor) {
    return formatoMoneda.format(valor);
  }

  global.Validaciones = {
    BANCOS: BANCOS,
    soloDigitos: soloDigitos,
    digitoClabe: digitoClabe,
    validarClabe: validarClabe,
    luhnValido: luhnValido,
    validarTarjeta: validarTarjeta,
    agruparDigitos: agruparDigitos,
    moneda: moneda
  };
})(window);
