// Prueba de interacción de extremo a extremo (Playwright, navegador real).
// Uso: npm run build && npm run e2e   (arranca `vite preview` automáticamente)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4179;
const URL = `http://localhost:${PORT}/`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
const assert = (cond, msg) => { if (!cond) throw new Error(`FALLO: ${msg}`); console.log(`  ✓ ${msg}`); };

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL)).ok) return; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
}

let browser;
const errors = [];
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  mkdirSync('e2e/screenshots', { recursive: true });

  /** Sección principal (menú superior o inferior) y, si se indica, su pestaña. */
  const goTo = async (section, tab) => {
    await page.getByRole('navigation').getByRole('button', { name: section, exact: true }).click();
    if (tab) await page.getByRole('tab', { name: tab, exact: true }).click();
  };
  /** Botón del menú «Más controles de tiempo» de la barra inferior. */
  const tool = async (name) => {
    await page.getByTestId('time-tools').click();
    await page.getByRole('dialog', { name: 'Controles de tiempo' }).getByRole('button', { name, exact: true }).click();
    await page.getByTestId('time-tools').click();
  };
  await page.goto(URL);
  assert(await page.getByTestId('welcome-tutorial').isVisible(), 'la bienvenida ofrece el tutorial de inicio');
  await page.getByRole('button', { name: 'Explorar por mi cuenta' }).click();
  assert(await page.getByTestId('card-slot').isVisible(), 'la app abre directamente en el simulador');
  assert(await page.getByTestId('tutorial-invite').isVisible(), 'el panel invita a hacer el tutorial');
  await page.screenshot({ path: 'e2e/screenshots/01-home.png' });

  await goTo('Simulador', 'Cabina');
  await page.getByTestId('led-magenta').click();
  assert((await page.locator('.cab-stage').getAttribute('style')).includes('#e879f9'), 'las luces LED cambian de color');
  await page.getByTestId('cab-gear').click();
  assert((await page.getByTestId('cab-gear').getAttribute('aria-label')).includes('detener'), 'el selector de marcha pone el camión en marcha');
  await page.getByTestId('cab-gear').click();
  // Interruptores y cámaras (Fase 4)
  const beamBefore = await page.getByTestId('headlight-beam').count();
  await page.getByTestId('switch-headlights').click();
  assert((await page.getByTestId('headlight-beam').count()) !== beamBefore, 'el interruptor de faros enciende o apaga el haz');
  await page.getByTestId('switch-headlights').click();
  await page.getByTestId('switch-interiorLight').click();
  assert((await page.getByTestId('dome-light').count()) === 1, 'la luz interior se enciende');
  await page.getByTestId('cab-mirror').click();
  await page.waitForTimeout(900);
  assert((await page.getByTestId('cab-stage').getAttribute('data-camera')) === 'mirror', 'la cámara se acerca al retrovisor');
  await page.keyboard.press('4');
  await page.getByTestId('roof-panel').waitFor();
  await page.getByTestId('led-brightness').fill('0.4');
  assert((await page.getByTestId('cab-stage').getAttribute('style')).includes('--led-intensity: 0.4'), 'la intensidad de los LED se ajusta');
  await page.getByTestId('camera-back').click();
  await page.screenshot({ path: 'e2e/screenshots/02-cabin.png' });
  // El tacógrafo se maneja dentro de la cabina
  await page.getByTestId('cabin-tachograph').click();
  await page.getByTestId('cab-device').waitFor();
  assert((await page.getByTestId('cab-device').getByTestId('tacho-display').count()) === 1, 'el tacógrafo se maneja dentro de la cabina');
  await page.getByRole('button', { name: 'Laboratorio completo →' }).click();
  await page.getByTestId('tacho-display').waitFor();
  assert(true, 'transición de cabina a tacógrafo');

  const line = (i) => page.getByTestId(`display-line-${i}`).innerText();
  // Mover el camión sin tarjeta genera un aviso que hay que confirmar.
  assert((await line(0)).includes('sin tarjeta'), 'aviso de conducción sin tarjeta');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(1)).includes('Inserte tarjeta'), 'sin tarjeta al inicio');
  assert(/\d\d:\d\d/.test(await line(0)) && (await line(0)).includes('km/h'), 'la pantalla de 2 líneas muestra la hora y la velocidad');

  // La tarjeta se arrastra desde la bandeja hasta la ranura
  await page.getByTestId('card-card-a').dragTo(page.getByTestId('card-slot'));
  assert((await line(0)).includes('Bienvenido'), 'inserción: pantalla de bienvenida');
  assert((await line(1)).includes('Alex Prácticas'), 'inserción muestra el titular de la tarjeta');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('Última retirada'), 'muestra la última retirada de la tarjeta');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('País de inicio'), 'pide país de inicio');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('Región inicio') && (await line(1)).includes('Andalucía'), 'en España pide la comunidad autónoma de inicio');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();

  // Llave de contacto junto al tacógrafo: 0 → I (pantalla iluminada) → II (arranque)
  await page.getByTestId('ignition-off').click();
  assert((await page.getByTestId('tacho-display').getAttribute('data-backlight')) === 'off', 'con la llave en 0 la pantalla se apaga');
  await page.getByTestId('truck-speed').fill('50');
  assert((await page.getByTestId('truck-speed').inputValue()) === '0', 'sin motor arrancado el acelerador no mueve el camión');
  await page.getByTestId('ignition-on').click();
  assert((await page.getByTestId('tacho-display').getAttribute('data-backlight')) === 'on', 'con la llave en I la pantalla se ilumina');
  await page.getByTestId('ignition-start').click();
  assert((await page.getByTestId('engine-status').innerText()).includes('Motor en marcha'), 'la llave en II arranca el motor');

  await page.getByRole('button', { name: 'Botón de actividad' }).click();
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Disponibilidad', 'botón de actividad cambia de otros trabajos (tras detener) a disponibilidad');

  await tool('+1 h');
  await page.getByTestId('truck-speed').fill('80');
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Conducción', 'el movimiento registra conducción');

  // Reloj ×60 durante ~2 s reales ≈ 2 min virtuales
  const before = await page.getByTestId('virtual-clock').innerText();
  await page.getByTestId('clock-speed').fill('4'); // deslizador: ×60
  await page.waitForTimeout(2200);
  await page.getByTestId('play-toggle').click();
  const after = await page.getByTestId('virtual-clock').innerText();
  assert(before !== after, `el reloj acelerado avanza (${before} → ${after})`);

  // Barra de control: deslizador de velocidad del camión y línea de tiempo
  await page.getByTestId('truck-speed').fill('60');
  assert((await page.getByTestId('truck-speed').inputValue()) === '60', 'el deslizador ajusta la velocidad del camión');
  const tl = await page.getByTestId('timeline').boundingBox();
  const clockBeforeDrag = await page.getByTestId('virtual-clock').innerText();
  const nowFrac = (await page.getByTestId('timeline').getAttribute('aria-valuenow')) - (await page.getByTestId('timeline').getAttribute('aria-valuemin'));
  const spanMs = (await page.getByTestId('timeline').getAttribute('aria-valuemax')) - (await page.getByTestId('timeline').getAttribute('aria-valuemin'));
  const x0 = tl.x + (tl.width * nowFrac) / spanMs;
  await page.mouse.move(x0 + 1, tl.y + tl.height / 2);
  await page.mouse.down();
  await page.mouse.move(x0 + tl.width / 336, tl.y + tl.height / 2, { steps: 5 });
  await page.mouse.up();
  assert((await page.getByTestId('virtual-clock').innerText()) !== clockBeforeDrag, 'arrastrar la línea de tiempo hace avanzar el reloj');
  await page.getByTestId('print').click();
  assert((await page.getByTestId('ticket').innerText()).includes('IMPRESIÓN DIARIA'), 'la impresora saca el ticket diario');
  await page.getByRole('button', { name: '✂ Cortar ticket' }).click();

  // Saltar hasta el aviso de 4 h 15
  await tool('Siguiente ⏭');
  await tool('Siguiente ⏭');
  assert((await line(0)).includes('4h'), 'aviso de conducción continua en pantalla');
  await page.screenshot({ path: 'e2e/screenshots/03-device-warning.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  // Seguir conduciendo tras el límite genera la infracción.
  await tool('+15 min');
  await page.getByTestId('truck-speed').fill('0');
  assert((await page.getByTestId('infringement-count').innerText()).includes('1 infracción'), 'el panel normativo cuenta la infracción');

  const clockBeforeReload = await page.getByTestId('virtual-clock').innerText();
  await page.reload();
  await goTo('Simulador', 'Panel');
  assert((await page.getByTestId('virtual-clock').innerText()) === clockBeforeReload, 'el estado sobrevive a la recarga');

  // Menú: cruce de frontera y trayecto en ferry/tren
  const menu = async (downs) => {
    await page.getByRole('button', { name: 'Confirmar / menú' }).click();
    for (let i = 0; i < downs; i++) await page.getByRole('button', { name: 'Abajo' }).click();
    await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  };
  const lcd = () => page.getByTestId('tacho-display').getAttribute('aria-label');
  await menu(5);
  assert((await line(0)).includes('País: frontera'), 'menú: país por cruce de frontera');
  await page.getByRole('button', { name: 'Abajo' }).click();
  await page.getByRole('button', { name: 'Abajo' }).click();
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('País registrado'), 'cruce de frontera registrado (Francia)');
  const dismiss = () => page.getByRole('button', { name: 'Retroceder' }).click(); // quita el mensaje sin abrir el menú
  await dismiss();
  await menu(6);
  await dismiss();
  assert((await lcd()).includes('⛴'), 'ferry/tren: el pictograma aparece en la pantalla por defecto');
  await page.screenshot({ path: 'e2e/screenshots/15-ferry.png' });
  await menu(6);
  await dismiss();
  assert(!(await lcd()).includes('⛴'), 'ferry/tren: se cierra desde el menú');

  // Retirada de la tarjeta como en un tacógrafo real
  // a) Mantener pulsada la tecla 1 inicia la retirada; ✕ la cancela
  const key1 = await page.getByRole('button', { name: 'Botón de actividad' }).boundingBox();
  await page.mouse.move(key1.x + key1.width / 2, key1.y + key1.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  assert((await line(0)).includes('País de fin'), 'mantener pulsada la tecla 1 pide el país de fin');
  await page.getByRole('button', { name: 'Retroceder' }).click();
  assert((await page.getByTestId('card-slot').getAttribute('aria-label')).includes('insertada'), '✕ cancela la retirada');
  // b) Botón ⏏ de la ranura → país de fin → ¿imprimir 24 h? SÍ → ticket y tarjeta fuera
  await page.getByTestId('eject-1').click();
  assert((await line(0)).includes('País de fin'), 'el botón ⏏ pide el país de fin');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('Región de fin'), 'en España pide la comunidad autónoma de fin');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(0)).includes('¿Imprimir 24 h?'), 'pregunta si imprimir antes de expulsar');
  await page.getByRole('button', { name: 'Arriba' }).click();
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert(await page.getByTestId('card-ejected').isVisible(), 'la tarjeta asoma por la ranura al expulsarse');
  assert((await page.getByTestId('ticket').innerText()).includes('IMPRESIÓN DIARIA'), 'sale el ticket de 24 h al retirar la tarjeta');
  await page.screenshot({ path: 'e2e/screenshots/09-card-eject.png' });
  await page.getByRole('button', { name: '✂ Cortar ticket' }).click();
  assert((await page.getByTestId('card-slot').getAttribute('aria-label')).includes('arrastra aquí'), 'la ranura queda vacía');


  await goTo('Mis semanas', 'Informe');
  assert((await page.getByTestId('findings').innerText()).includes('4 h 30 min'), 'el informe muestra la infracción de conducción continua con su norma');
  await page.screenshot({ path: 'e2e/screenshots/06-report.png', fullPage: true });

  await goTo('Mis semanas', 'Calendario');
  await page.getByTestId('history-table').waitFor();
  const rows = await page.getByTestId('history-table').locator('tbody tr').count();
  assert(rows >= 2, `el calendario muestra el registro de actividades (${rows})`);
  assert((await page.getByTestId('day-detail').count()) === 1, 'el calendario muestra el detalle del día');

  // Biblioteca de escenarios: cargar la referencia 56 + 34 h
  await goTo('Academia', 'Escenarios');
  assert(await page.getByTestId('load-week2-34').isDisabled(), 'los escenarios premium están bloqueados en el plan gratuito');
  await page.getByTestId('load-ref-5634').click();
  await page.getByTestId('confirm-ok').click();
  await page.getByTestId('history-days').waitFor();
  await page.screenshot({ path: 'e2e/screenshots/04-calendar.png', fullPage: true });
  await goTo('Mis semanas', 'Informe');
  await page.getByTestId('objectives').waitFor();
  const objectives = await page.getByTestId('objectives').innerText();
  assert(objectives.includes('✓ Semana 1 con 56 h') && objectives.includes('✓ Semana 2 con 34 h') && objectives.includes('✓ Sin infracciones'), 'la referencia 56 + 34 h cumple todos los objetivos');
  await page.screenshot({ path: 'e2e/screenshots/07-report-reference.png', fullPage: true });

  // Guardados: el plan gratuito permite uno
  await goTo('Academia', 'Escenarios');
  await page.getByTestId('save-slot').click();
  await page.getByText('Escenario guardado').waitFor();
  await page.getByTestId('save-slot').click();
  await page.getByText('Tu plan permite 1').waitFor();
  assert((await page.getByTestId('slots').locator('li').count()) === 1, 'el plan gratuito limita a un escenario guardado');
  await page.screenshot({ path: 'e2e/screenshots/08-scenarios.png', fullPage: true });

  // Academia: ejercicio 1 resuelto con los botones del tacógrafo
  await goTo('Academia', 'Ejercicios');
  await page.getByTestId('exercise-list').getByText('Conocer los botones').click();
  await page.getByTestId('start-buttons').click();
  await page.getByTestId('confirm-ok').click();
  await page.getByTestId('exercise-panel').waitFor();
  const press = (label, n = 1) => Array.from({ length: n }).reduce((p) => p.then(() => page.getByRole('button', { name: label, exact: true }).click()), Promise.resolve());
  await press('Abajo', 2);
  await press('Confirmar / menú');
  await press('Abajo', 4);
  await press('Confirmar / menú');
  await press('Retroceder', 2);
  await press('Botón de actividad');
  assert((await page.getByTestId('exercise-steps').locator('li').filter({ hasText: '✓' }).count()) === 6, 'el ejercicio avanza paso a paso con los botones');
  await page.screenshot({ path: 'e2e/screenshots/10-exercise.png', fullPage: true });
  await page.getByTestId('exercise-finish').click();
  assert((await page.getByTestId('exercise-score').innerText()) === '100', 'el ejercicio 1 se evalúa con 100 puntos');
  await page.screenshot({ path: 'e2e/screenshots/11-exercise-result.png' });
  await page.getByTestId('result-back').click();
  assert((await page.getByTestId('free-progress').innerText()) === '1/5', 'la academia guarda el progreso');
  assert((await page.getByTestId('badges').innerText()).includes('🏅 Primeros pasos'), 'se obtiene la insignia «Primeros pasos»');
  await page.screenshot({ path: 'e2e/screenshots/12-academy.png', fullPage: true });

  // Vista móvil: modo dispositivo recomendado y barra de control fija
  await page.setViewportSize({ width: 390, height: 844 });
  await goTo('Simulador', 'Cabina');
  await page.getByRole('button', { name: 'Abrir el modo dispositivo' }).click();
  await page.getByTestId('control-dock').waitFor();
  assert(await page.getByTestId('control-dock').isVisible(), 'en móvil, modo dispositivo con barra de control fija');
  await goTo('Simulador', 'Panel');
  await page.screenshot({ path: 'e2e/screenshots/05-mobile.png', fullPage: true });

  // Tutorial de inicio completo, con clics reales sobre el simulador
  await page.setViewportSize({ width: 1440, height: 950 });
  await goTo('Simulador', 'Panel');

  // Reiniciar: empezar de cero y repetir la jornada (vuelve a justo antes de meter la tarjeta)
  await page.getByTestId('reset-menu').click();
  await page.getByTestId('restart-all').click();
  await page.getByTestId('confirm-ok').click();
  assert((await page.getByTestId('virtual-clock').innerText()).startsWith('06:00'), 'empezar de cero vuelve al lunes 06:00 UTC');
  await tool('+1 h');
  await page.getByTestId('card-slot').click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  await tool('+1 h');
  assert((await page.getByTestId('virtual-clock').innerText()).startsWith('08:00'), 'una hora de jornada con tarjeta');
  await page.getByTestId('reset-menu').click();
  await page.getByTestId('restart-shift').click();
  await page.getByTestId('confirm-ok').click();
  assert((await page.getByTestId('virtual-clock').innerText()).startsWith('07:00'), 'repetir la jornada vuelve al momento previo a la inserción');
  assert((await line(1)).includes('Inserte tarjeta'), 'repetir la jornada: la tarjeta vuelve a estar fuera');

  // Sonido: efectos y música country sintetizados sin errores
  await page.getByTestId('sound-button').click();
  await page.getByText('Música country').click();
  await page.waitForTimeout(800);
  assert(await page.getByTestId('music-toggle').isChecked(), 'se activa la música country');
  await page.getByText('Música country').click();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Guía', exact: true }).click();
  await page.screenshot({ path: 'e2e/screenshots/13-guide.png', fullPage: true });
  await page.getByTestId('start-tutorial').click();
  // Si hay actividad previa, pide confirmar que empieza un turno nuevo
  if (await page.getByTestId('confirm-ok').isVisible()) await page.getByTestId('confirm-ok').click();
  const tut = page.getByTestId('tutorial');
  const title = () => tut.getByRole('heading').innerText();
  const ok = () => page.getByRole('button', { name: 'Confirmar / menú' }).click();
  const box = async (loc) => loc.boundingBox();
  const clash = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const expectStep = async (t) => {
    assert((await title()) === t, `tutorial: «${t}»`);
    await page.waitForTimeout(450); // la tarjeta se recoloca tras el desplazamiento
    const card = await box(tut);
    assert(!clash(card, await box(page.getByTestId('tacho-display'))) && !clash(card, await box(page.locator('[data-tour="keys"]'))),
      `tutorial: «${t}» no tapa la pantalla ni las teclas del tacógrafo`);
  };
  assert((await title()) === 'Tu primer turno con el tacógrafo', 'tutorial: introducción');
  await tut.getByTestId('driver-name').fill('María José');
  await tut.getByTestId('driver-name-save').click();
  await page.getByTestId('tutorial-next').click();
  await expectStep('El tacógrafo');
  assert(await page.getByTestId('tutorial-spotlight').isVisible(), 'tutorial: resalta la pieza del paso');
  await page.screenshot({ path: 'e2e/screenshots/14-tutorial.png' });
  await page.getByTestId('tutorial-next').click();
  await expectStep('Mete la tarjeta de conductor');
  await page.getByTestId('card-card-a').dragTo(page.getByTestId('card-slot'));
  await expectStep('Bienvenida');
  assert((await line(1)).includes('María José'), 'el tacógrafo da la bienvenida con el nombre del alumno');
  await ok();
  await expectStep('Última retirada');
  await ok();
  await expectStep('País de inicio');
  await ok();
  await ok();
  await expectStep('Da el contacto');
  await page.getByTestId('ignition-on').click();
  await expectStep('Arranca el motor');
  await page.getByTestId('ignition-start').click();
  await expectStep('A conducir');
  await page.getByTestId('truck-speed').fill('80');
  await expectStep('Haz pasar el tiempo');
  await tool('+15 min');
  await tool('+15 min');
  await expectStep('¿Cuánto te queda de conducción?');
  await page.getByRole('button', { name: 'Abajo' }).click();
  assert((await line(0)).includes('hasta pausa') && (await line(1)).includes('fin jornada'), 'el tacógrafo muestra el tiempo de conducción restante');
  await expectStep('Detén el camión');
  await page.getByTestId('truck-speed').fill('0');
  await expectStep('Elige la actividad: descanso');
  await page.getByRole('button', { name: 'Botón de actividad' }).click();
  await page.getByRole('button', { name: 'Botón de actividad' }).click();
  await expectStep('Saca la tarjeta');
  await page.getByTestId('eject-1').click();
  await expectStep('País de fin e impresión');
  await ok();
  await ok();
  await ok();
  await expectStep('¡Turno completado!');
  await page.getByTestId('tutorial-finish').click();
  assert((await page.getByTestId('tutorial').count()) === 0 && (await page.getByTestId('tutorial-invite').count()) === 0, 'tutorial terminado: ya no se ofrece');
  assert((await page.getByTestId('card-card-a').innerText()).includes('María José'), 'la tarjeta de la bandeja lleva el nombre del alumno');
  await page.getByRole('button', { name: 'Ajustes' }).first().click();
  await page.getByTestId('driver-name-clear').click();
  await goTo('Simulador', 'Panel');
  assert((await page.getByTestId('card-card-a').innerText()).includes('Alex Prácticas'), 'se puede borrar el nombre y volver al de ejemplo');

  assert(errors.length === 0, `sin errores de ejecución en consola${errors.length ? ': ' + errors.join(' | ') : ''}`);
  console.log('\nE2E OK');
} catch (e) {
  console.error(e.message);
  if (errors.length) console.error('Errores en la página:', errors.join(' | '));
  process.exitCode = 1;
} finally {
  await browser?.close();
  try { process.kill(-server.pid); } catch { /* ya terminado */ }
}
