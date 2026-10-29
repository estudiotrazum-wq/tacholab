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
  await page.getByRole('button', { name: 'Entendido, empezar' }).click();
  assert(await page.getByTestId('card-slot').isVisible(), 'la app abre directamente en el simulador');
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
  assert((await page.getByTestId('display-title').innerText()).includes('AVISO'), 'aviso de conducción sin tarjeta');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(1)).includes('SIN TARJETA'), 'sin tarjeta al inicio');
  assert((await page.getByTestId('display-title').innerText()).includes('UTC'), 'la pantalla del tacógrafo muestra la hora UTC');

  // La tarjeta se arrastra desde la bandeja hasta la ranura
  await page.getByTestId('card-card-a').dragTo(page.getByTestId('card-slot'));
  assert((await page.getByTestId('display-title').innerText()).includes('BIENVENIDA'), 'inserción muestra bienvenida');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await page.getByTestId('display-title').innerText()).includes('PAÍS INICIO'), 'pide país de inicio');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();

  await page.getByRole('button', { name: 'Botón de actividad' }).click();
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Disponibilidad', 'botón de actividad cambia de otros trabajos (tras detener) a disponibilidad');

  await tool('+1 h');
  await page.getByTestId('vehicle-toggle').click();
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Conducción', 'el movimiento registra conducción');

  // Reloj ×60 durante ~2 s reales ≈ 2 min virtuales
  const before = await page.getByTestId('virtual-clock').innerText();
  await page.getByTestId('control-dock').getByRole('button', { name: '×60' }).click();
  await page.waitForTimeout(2200);
  await page.getByTestId('play-toggle').click();
  const after = await page.getByTestId('virtual-clock').innerText();
  assert(before !== after, `el reloj acelerado avanza (${before} → ${after})`);

  // Saltar hasta el aviso de 4 h 15
  await tool('Siguiente ⏭');
  await tool('Siguiente ⏭');
  assert((await page.getByTestId('display-title').innerText()).includes('AVISO'), 'aviso de conducción continua en pantalla');
  await page.screenshot({ path: 'e2e/screenshots/03-device-warning.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  // Seguir conduciendo tras el límite genera la infracción.
  await tool('+15 min');
  await page.getByTestId('vehicle-toggle').click();
  assert((await page.getByTestId('infringement-count').innerText()).includes('1 infracción'), 'el panel normativo cuenta la infracción');

  const clockBeforeReload = await page.getByTestId('virtual-clock').innerText();
  await page.reload();
  await goTo('Simulador', 'Panel');
  assert((await page.getByTestId('virtual-clock').innerText()) === clockBeforeReload, 'el estado sobrevive a la recarga');

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
