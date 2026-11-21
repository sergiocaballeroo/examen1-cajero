import { chromium } from 'playwright';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.BASE || 'file:///' + RAIZ.split(path.sep).join('/') + '/index.html';
const CAPTURAS = path.join(RAIZ, 'evidencias', 'capturas');
const errores = [];
let n = 0;
const ok = (cond, msg) => { n++; if (!cond) { errores.push(msg); console.log('FALLA ' + n + ': ' + msg); } else console.log('ok    ' + n + ': ' + msg); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const consola = [];
page.on('console', m => { if (m.type() === 'error') consola.push(m.text()); });
page.on('pageerror', e => consola.push(String(e)));

const texto = async () => (await page.locator('#pantalla').innerText());
const cap = (nombre) => page.screenshot({ path: path.join(CAPTURAS, nombre + '.png'), fullPage: true });
const tecla = async (t) => page.click(`[data-tecla="${t}"]`);
const digitos = async (s) => { for (const d of s) await tecla(d); };
const insertar = async () => { await page.click('[data-accion="insertar"]'); await page.waitForFunction(() => !document.querySelector('#pantalla').innerText.includes('Inserte su tarjeta')); };

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
ok((await texto()).includes('Inserte su tarjeta'), 'pantalla de bienvenida');
await cap('01-bienvenida');

// a) Ingreso al sistema
await insertar();
ok((await texto()).includes('Ingrese su NIP'), 'pantalla de NIP');
await cap('02-nip');
await digitos('1234'); await tecla('aceptar');
ok((await texto()).includes('NIP incorrecto') && (await texto()).includes('2 intentos'), 'NIP incorrecto resta intentos');
await cap('03-nip-incorrecto');
await page.keyboard.type('9999'); await page.keyboard.press('Enter');
ok((await texto()).includes('1 intento.'), 'teclado físico y segundo intento');
await digitos('8420'); await tecla('aceptar');
ok((await texto()).includes('¿Qué operación'), 'NIP 8420 entra al menú');
await cap('04-menu');

// b) Consulta de saldo
await page.click('[data-vista="saldo"]');
ok((await texto()).includes('$12,500.00'), 'saldo inicial 12,500');
await cap('05-saldo');
await page.click('[data-vista="menu"]');

// c) Retiro rápido 500
await page.click('[data-vista="retiro"]');
await cap('06-retiro');
await page.click('[data-monto="500"]');
ok((await texto()).includes('Confirme la operación') && (await texto()).includes('$500.00'), 'confirmación de retiro 500');
await cap('07-confirmar-retiro');
await page.click('[data-accion="aceptar"]');
await page.waitForSelector('.resumen--ticket', { timeout: 5000 });
ok((await texto()).includes('$12,000.00') && (await texto()).includes('1 × $500'), 'comprobante retiro: saldo 12,000 y 1 billete de 500');
await cap('08-comprobante-retiro');

// c) Otro monto: validaciones
await page.click('[data-vista="menu"]');
await page.click('[data-vista="retiro"]');
await page.click('[data-vista="retiro-monto"]');
await digitos('150'); await tecla('aceptar');
ok((await texto()).includes('múltiplo'), 'rechaza 150 (no múltiplo de 100)');
await cap('09-retiro-otro-monto-error');
await tecla('borrar'); await tecla('borrar'); await tecla('borrar');
await digitos('7000'); await tecla('aceptar');
ok((await texto()).includes('máximo por operación'), 'rechaza 7000 (> 6000 por operación)');
for (let i = 0; i < 4; i++) await tecla('borrar');
await digitos('6000'); await tecla('aceptar'); await page.click('[data-accion="aceptar"]');
await page.waitForSelector('.resumen--ticket');
ok((await texto()).includes('$6,000.00'), 'retiro de 6000 aceptado');
await page.click('[data-vista="menu"]');
await page.click('[data-vista="retiro"]');
await page.click('[data-monto="3000"]');
ok((await texto()).includes('límite diario'), 'rechaza 3000 por límite diario (ya van 6500 de 9000)');
await page.click('[data-monto="2000"]');
ok((await texto()).includes('Confirme'), 'acepta 2000 dentro del límite diario');
await tecla('cancelar');
ok((await texto()).includes('¿Qué operación'), 'Cancelar regresa al menú');

// d) Depósito a otra cuenta
await page.click('[data-vista="deposito-tipo"]');
await cap('10-deposito-tipo');
await page.click('[data-tipo="CLABE"]');
await digitos('072180009876543210'); await tecla('aceptar');
ok((await texto()).includes('dígito verificador'), 'rechaza CLABE con dígito verificador incorrecto');
await cap('11-deposito-clabe-error');
for (let i = 0; i < 18; i++) await tecla('borrar');
await digitos('012180001234567899'); await tecla('aceptar');
ok((await texto()).includes('propia cuenta'), 'rechaza depósito a la propia cuenta');
for (let i = 0; i < 18; i++) await tecla('borrar');
await digitos('999180009876543210');
ok((await texto()).includes('no reconocida'), 'muestra institución no reconocida');
for (let i = 0; i < 18; i++) await tecla('borrar');
await digitos('072180009876543213');
ok((await texto()).includes('Banorte'), 'detecta Banorte por la CLABE');
await cap('12-deposito-clabe');
await tecla('aceptar');
ok((await texto()).includes('monto a depositar'), 'pasa a monto de depósito');
await digitos('99999'); await tecla('aceptar');
ok((await texto()).includes('máximo por operación'), 'rechaza depósito > 20,000');
for (let i = 0; i < 5; i++) await tecla('borrar');
await digitos('1250'); await tecla('aceptar');
await cap('13-confirmar-deposito');
ok((await texto()).includes('Banorte') && (await texto()).includes('$1,250.00'), 'confirmación de depósito');
await page.click('[data-accion="aceptar"]');
await page.waitForSelector('.resumen--ticket');
ok((await texto()).includes('$4,750.00'), 'saldo final 4,750 tras depósito');
await cap('14-comprobante-deposito');

// Depósito con tarjeta (Luhn)
await page.click('[data-vista="menu"]');
await page.click('[data-vista="deposito-tipo"]');
await page.click('[data-tipo="Tarjeta"]');
await digitos('5471234567890123'); await tecla('aceptar');
ok((await texto()).includes('no es válido'), 'rechaza tarjeta que no pasa Luhn');
await page.click('.ayuda summary'); await page.click('[data-accion="llenar"][data-numero="5471234567890128"]');
await tecla('aceptar');
ok((await texto()).includes('Mastercard'), 'acepta tarjeta Mastercard válida');
await digitos('5000'); await tecla('aceptar');
ok((await texto()).includes('Saldo insuficiente'), 'rechaza depósito mayor al saldo');

// Salir y persistencia
await tecla('cancelar'); await page.click('#btn-salir');
ok((await texto()).includes('Gracias por su visita'), 'despedida');
await cap('15-despedida');
await page.reload();
await insertar();
await digitos('8420'); await tecla('aceptar');
await page.click('[data-vista="saldo"]');
ok((await texto()).includes('$4,750.00'), 'saldo persiste tras recargar');

// Bloqueo por 3 intentos
await page.evaluate(() => localStorage.clear());
await page.reload();
await insertar();
for (const nip of ['0000', '1111', '2222']) { await digitos(nip); await tecla('aceptar'); }
ok((await texto()).includes('Tarjeta retenida'), 'bloqueo tras 3 intentos');
await cap('16-bloqueada');
await page.reload();
await insertar();
ok((await texto()).includes('Tarjeta retenida'), 'bloqueo persiste');
page.once('dialog', d => d.accept());
await page.click('[data-accion="restablecer"]');
await insertar();
ok((await texto()).includes('Ingrese su NIP'), 'restablecer quita el bloqueo');

// Responsivo
await page.setViewportSize({ width: 400, height: 860 });
await page.reload();
const ancho = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
ok(ancho, 'sin scroll horizontal a 400px');
await cap('17-movil');

ok(consola.length === 0, 'sin errores de consola: ' + consola.join(' | '));
await browser.close();
console.log(`\n${n - errores.length}/${n} pruebas pasaron`);
process.exit(errores.length ? 1 : 0);
