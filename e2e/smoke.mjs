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
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  mkdirSync('e2e/screenshots', { recursive: true });

  await page.goto(URL);
  await page.getByRole('button', { name: 'Entendido' }).click();
  assert(await page.getByRole('heading', { name: 'TachoLab EU' }).isVisible(), 'la página de inicio carga');
  await page.screenshot({ path: 'e2e/screenshots/01-home.png' });

  await page.getByRole('button', { name: 'Entrar en la cabina' }).click();
  await page.getByTestId('led-magenta').click();
  assert((await page.locator('.cab-stage').getAttribute('style')).includes('#e879f9'), 'las luces LED cambian de color');
  await page.getByTestId('cab-gear').click();
  assert((await page.getByTestId('cab-gear').getAttribute('aria-label')).includes('detener'), 'el selector de marcha pone el camión en marcha');
  await page.getByTestId('cab-gear').click();
  await page.screenshot({ path: 'e2e/screenshots/02-cabin.png' });
  await page.getByTestId('cabin-tachograph').click();
  await page.getByTestId('tacho-display').waitFor();
  assert(true, 'transición de cabina a tacógrafo');

  const line = (i) => page.getByTestId(`display-line-${i}`).innerText();
  // Mover el camión sin tarjeta genera un aviso que hay que confirmar.
  assert((await page.getByTestId('display-title').innerText()).includes('AVISO'), 'aviso de conducción sin tarjeta');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await line(1)).includes('SIN TARJETA'), 'sin tarjeta al inicio');
  assert((await page.getByTestId('display-title').innerText()).includes('UTC'), 'la pantalla del tacógrafo muestra la hora UTC');

  await page.getByTestId('card-slot').click();
  assert((await page.getByTestId('display-title').innerText()).includes('BIENVENIDA'), 'inserción muestra bienvenida');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  assert((await page.getByTestId('display-title').innerText()).includes('PAÍS INICIO'), 'pide país de inicio');
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();

  await page.getByRole('button', { name: 'Botón de actividad' }).click();
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Disponibilidad', 'botón de actividad cambia de otros trabajos (tras detener) a disponibilidad');

  await page.getByRole('button', { name: '+1 h' }).click();
  await page.getByTestId('vehicle-toggle').click();
  assert((await page.getByTestId('recorded-activity').innerText()) === 'Conducción', 'el movimiento registra conducción');

  // Reloj ×60 durante ~2 s reales ≈ 2 min virtuales
  const before = await page.getByTestId('virtual-clock').innerText();
  await page.getByRole('button', { name: '×60' }).click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: '❚❚' }).click();
  const after = await page.getByTestId('virtual-clock').innerText();
  assert(before !== after, `el reloj acelerado avanza (${before} → ${after})`);

  // Saltar hasta el aviso de 4 h 15
  await page.getByRole('button', { name: 'Siguiente ⏭' }).click();
  await page.getByRole('button', { name: 'Siguiente ⏭' }).click();
  assert((await page.getByTestId('display-title').innerText()).includes('AVISO'), 'aviso de conducción continua en pantalla');
  await page.screenshot({ path: 'e2e/screenshots/03-device-warning.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirmar / menú' }).click();
  // Seguir conduciendo tras el límite genera la infracción.
  await page.getByRole('button', { name: '+15 min' }).click();
  await page.getByTestId('vehicle-toggle').click();
  assert((await page.getByTestId('infringement-count').innerText()).includes('1 infracción'), 'el panel normativo cuenta la infracción');

  const clockBeforeReload = await page.getByTestId('virtual-clock').innerText();
  await page.reload();
  await page.getByRole('button', { name: 'Tacógrafo', exact: true }).click();
  assert((await page.getByTestId('virtual-clock').innerText()) === clockBeforeReload, 'el estado sobrevive a la recarga');

  await page.getByRole('button', { name: 'Informe', exact: true }).click();
  assert((await page.getByTestId('findings').innerText()).includes('4 h 30 min'), 'el informe muestra la infracción de conducción continua con su norma');
  await page.screenshot({ path: 'e2e/screenshots/06-report.png', fullPage: true });

  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  const rows = await page.getByTestId('history-table').locator('tbody tr').count();
  assert(rows >= 2, `el historial muestra registros (${rows})`);
  await page.screenshot({ path: 'e2e/screenshots/04-history.png', fullPage: true });

  // Vista móvil
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Tacógrafo', exact: true }).click();
  await page.screenshot({ path: 'e2e/screenshots/05-mobile.png', fullPage: true });

  assert(errors.length === 0, `sin errores de ejecución en consola${errors.length ? ': ' + errors.join(' | ') : ''}`);
  console.log('\nE2E OK');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  try { process.kill(-server.pid); } catch { /* ya terminado */ }
}
