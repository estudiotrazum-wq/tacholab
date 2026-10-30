import { t } from '@/i18n';
import type { ReactNode } from 'react';
import type { Activity } from '@/shared/types';
import { ACTIVITY_LABEL } from '@/shared/types';
import { TUTORIAL_STEPS } from '@/tutorial/steps';
import { ActivityIcon, ACTIVITY_COLOR } from '../components/icons';
import { startTutorial } from '../tutorial';
import { useUiStore } from '../uiStore';

/**
 * Guía de inicio: acceso al tutorial interactivo y chuleta de consulta
 * con el manejo del tacógrafo y las normas básicas del Reglamento (CE) 561/2006.
 */
export function GuideScreen() {
  const go = useUiStore((s) => s.go);
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Tutorial interactivo */}
      <section className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{t('Guía de inicio')}</p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{t('Aprende a usar el tacógrafo en 5 minutos')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {t('El tutorial interactivo te acompaña en un turno completo sobre el simulador real: cada paso señala qué pieza tocar y avanza solo cuando lo haces. {n} pasos, sin prisa y sin poder romper nada.', { n: TUTORIAL_STEPS.length })}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={startTutorial} data-testid="start-tutorial" className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-lg transition hover:scale-[1.02]">
            ▶ {t('Empezar el tutorial')}
          </button>
          <button type="button" onClick={() => go('academy')} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15">
            {t('Ir a los ejercicios')}
          </button>
        </div>
        <ol className="mt-6 grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
          {[t('Meter la tarjeta y país de inicio'), t('Llave, arranque y conducción'), t('Pausas y actividades'), t('Sacar la tarjeta e imprimir')].map((t, i) => (
            <li key={t} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-400 text-[11px] font-bold text-slate-950">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">{t('Guía rápida de consulta')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card n="1" title={t('Las piezas del tacógrafo')}>
          <Dl
            items={[
              [t('Pantalla'), t('Estándar: hora local, modo y velocidad; abajo, tarjeta y actividad del conductor 1, cuentakilómetros y conductor 2. Con ▼: tiempos del conductor (conducción continua o duración de la actividad, y descanso), conducción restante, amplitud de jornada (13 h / 15 h), acumulados y hora UTC/local.')],
              [t('Menú (OK)'), t('Solo parado. Imprimir conduc.1 · Entrada conduc.1 (país comienzo, país final, cruce frontera) · Entrada vehículo (OUT, ferry/tren) · Visualizar cond.1 · Información.')],
              ['✕ ▲ ▼ OK', t('Volver, moverse por las opciones y confirmar / abrir el menú.')],
              [t('Tecla 1 / 2'), t('Pulsación corta: cambia la actividad del conductor 1 o 2. Mantener pulsada: sacar la tarjeta.')],
              ['⏏', t('Botón de expulsión junto a cada ranura.')],
              [t('Impresora'), t('Saca el ticket con el resumen de las últimas 24 h.')],
              [t('Llave'), t('0 apagado · I contacto (se ilumina la pantalla) · II arranque.')],
            ]}
          />
        </Card>

        <Card n="2" title={t('Empezar la jornada')}>
          <Steps
            items={[
              t('Con el camión parado, mete la tarjeta en la ranura 1 (conductor).'),
              t('Bienvenida: tu nombre, la hora local y la hora UTC → OK.'),
              t('Última retirada: fecha y hora (local) en que sacaste la tarjeta → OK.'),
              t('Si hay un hueco sin tarjeta: «¿Entrada manual?» → ver punto 3.'),
              t('País de inicio con ▲ ▼ → OK. En España, también la comunidad autónoma → OK. «Listo para conducir».'),
              t('Llave a I y luego a II para arrancar.'),
            ]}
          />
        </Card>

        <Card n="3" title={t('Entradas manuales')}>
          <p className="text-sm text-slate-300">
            {t('Sirven para declarar qué hiciste mientras la tarjeta estaba fuera (por ejemplo, el descanso de la noche).')}
          </p>
          <Steps
            items={[
              t('«¿Entrada manual?» SÍ → OK.'),
              t('Para cada tramo: actividad (▲ ▼) → OK → hora de fin → OK → minutos → OK.'),
              t('Si el tramo no llega hasta la inserción, se abre otro tramo.'),
              t('País de comienzo (y en España, comunidad autónoma) → OK.'),
              t('«¿Confirmar?» → OK: listo para conducir.'),
            ]}
          />
          <p className="mt-2 text-xs text-slate-400">{t('Si respondes NO, ese periodo queda como desconocido. Practícalo en el ejercicio 2 de la Academia.')}</p>
        </Card>

        <Card n="4" title={t('Actividades y pictogramas')}>
          <ul className="grid gap-2 text-sm">
            {(
              [
                ['DRIVING', t('Se registra sola cuando el camión se mueve.')],
                ['WORK', t('Carga, descarga, limpieza, papeleo… Por defecto al parar.')],
                ['AVAILABILITY', t('Esperas cuya duración conoces de antemano.')],
                ['REST', t('Pausas y descansos: no puedes trabajar.')],
              ] as [Activity, string][]
            ).map(([a, d]) => (
              <li key={a} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2">
                <span style={{ color: ACTIVITY_COLOR[a] }} className="mt-0.5"><ActivityIcon activity={a} className="h-5 w-5" /></span>
                <span><strong className="text-white">{t(ACTIVITY_LABEL[a])}</strong> <span className="text-slate-400">— {d}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">{t('Con el camión parado, cambia la actividad con pulsaciones cortas de la tecla 1.')}</p>
        </Card>

        <Card n="5" title={t('Terminar la jornada')}>
          <Steps
            items={[
              t('Detén el camión (acelerador a 0) y elige la actividad.'),
              t('Pulsa ⏏ junto a la ranura o mantén pulsada la tecla 1.'),
              t('País de fin con ▲ ▼ → OK (en España, también la comunidad autónoma).'),
              t('«¿Imprimir 24 h?» SÍ o NO → OK.'),
              t('La tarjeta sale: retírala. Con ✕ puedes cancelar antes de confirmar.'),
            ]}
          />
          <p className="mt-2 text-xs text-slate-400">{t('No se puede sacar la tarjeta con el vehículo en marcha.')}</p>
        </Card>

        <Card n="6" title={t('Manejar el tiempo del simulador')}>
          <Dl
            items={[
              ['▶ / ❚❚', t('Reproduce o pausa el reloj virtual.')],
              [t('Velocidad del reloj'), t('De ×1 (tiempo real) a ×3600 (una hora por segundo). Desde ×300, el reloj se pausa solo al saltar un aviso.')],
              [t('Línea de tiempo'), t('Arrastra el cursor a la derecha para avanzar en pasos de 15 min.')],
              [t('Siguiente evento ⏭'), t('Salta al próximo aviso o límite.')],
              ['⋯', t('Avanzar a una hora concreta y puntos de restauración.')],
            ]}
          />
          <p className="mt-2 text-xs text-slate-400">{t('El tiempo solo avanza. Todas las horas del tacógrafo están en UTC.')}</p>
        </Card>

        <Card n="7" title={t('Frontera, ferry/tren y fuera de ámbito')}>
          <Dl
            items={[
              [t('Frontera'), t('Al entrar en otro país, en la primera parada: OK → «Entrada conduc.1» → «Cruce frontera» → país → OK (art. 34.7 R. 165/2014).')],
              [t('Ferry/tren'), t('Ya a bordo y antes de apagar el motor: OK → «Entrada vehículo» → «Comienzo ferry/tren». Se cierra al salir conduciendo, al sacar la tarjeta o desde el menú.')],
              [t('Art. 9'), t('A bordo, el descanso puede interrumpirse hasta 2 veces, sin pasar de 1 h en total, si tienes cama o litera.')],
              [t('Fuera ámbito'), t('Transporte no sujeto al R. 561/2006. Se cierra al meter o sacar la tarjeta.')],
            ]}
          />
          <p className="mt-2 text-xs text-slate-400">{t('Mientras haya una condición abierta, su pictograma aparece en la pantalla principal.')}</p>
        </Card>

        <Card n="8" title={t('Errores, reinicio y sonido')}>
          <Dl
            items={[
              [t('↺ Repetir'), t('«Reiniciar → Repetir la jornada» vuelve a justo antes de meter la tarjeta: ideal para repetir el procedimiento.')],
              [t('⟲ De cero'), t('«Reiniciar → Empezar de cero» borra las dos semanas.')],
              [t('Sonido'), t('Pitidos de las teclas, tarjeta, impresora, avisos y motor del camión. La música country se activa en «Sonido».')],
            ]}
          />
        </Card>

        <Card n="9" title={t('Normas básicas de tiempos')} wide>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              [t('Conducción continua'), t('Máx. 4 h 30 → pausa de 45 min (o 15 + 30 min, en ese orden).'), t('Art. 7')],
              [t('Conducción diaria'), t('Máx. 9 h; hasta 10 h dos veces por semana.'), t('Art. 6.1')],
              [t('Conducción semanal'), t('Máx. 56 h en una semana y 90 h en dos semanas seguidas.'), t('Art. 6.2 y 6.3')],
              [t('Descanso diario'), t('11 h (o 3 + 9 h). Reducido a 9 h como máximo tres veces entre descansos semanales.'), t('Art. 8.2 y 8.4')],
              [t('Amplitud de jornada'), t('El descanso diario debe caber en las 24 h desde que empiezas: jornada de 13 h como máximo con descanso de 11 h, o 15 h con uno reducido de 9 h.'), t('Art. 8.2')],
              [t('Descanso semanal'), t('45 h normal; reducido de 24 h con compensación. Tras 6 periodos de 24 h como mucho.'), t('Art. 8.6')],
            ].map(([name, d, ref]) => (
              <div key={name} className="rounded-xl bg-white/5 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-white">{name}</strong>
                  <span className="shrink-0 text-[11px] text-cyan-300">{t('R. (CE) 561/2006')} · {ref}</span>
                </div>
                <p className="text-slate-400">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('Resumen orientativo. Consulta el texto oficial y sus excepciones; el informe del simulador detalla cada regla con su referencia.')}</p>
        </Card>

        <Card n="10" title={t('Atajos de teclado')}>
          <Dl
            items={[
              ['↑ ↓', t('Moverse / cambiar valor')],
              [t('Enter · Esc'), t('OK · retroceder')],
              ['A · E', t('Tecla de actividad · sacar tarjeta')],
              ['I', t('Meter tu tarjeta (la primera)')],
              ['K · M', t('Girar la llave · marcha / parada')],
              [t('Espacio'), t('Reproducir / pausa')],
            ]}
          />
        </Card>
      </div>

      <p className="px-1 text-xs text-slate-500">
        {t('TachoLab EU es un simulador educativo independiente, no homologado. Reproduce el modelo de uso común de los tacógrafos digitales con un diseño propio; no imita ningún equipo comercial ni sustituye la formación oficial.')}
      </p>
    </div>
  );
}

function Card({ n, title, children, wide = false }: { n: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`glass rounded-2xl p-5 ${wide ? 'md:col-span-2' : ''}`} aria-labelledby={`guide-${n}`}>
      <h3 id={`guide-${n}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/10 text-xs text-cyan-300">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-1 space-y-1.5 text-sm text-slate-300">
      {items.map((t, i) => (
        <li key={t} className="flex gap-2">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-slate-200">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

function Dl({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="whitespace-nowrap font-mono text-xs leading-5 text-cyan-200">{k}</dt>
          <dd className="text-slate-300">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
