import { describe, expect, it } from 'vitest';
import { simReducer, type SimAction } from './engine';
import { createInitialSim, type SimState } from './state';
import { complianceFor, deriveSummary } from './derived';
import { HOUR, MINUTE } from '@/time-engine/units';
import { driverEvents, sumActivities } from '@/time-engine/timeline';
import { addZonedDays, startOfZonedDay } from '@/time-engine/zoned';
import { lcdLength, lcdPlain, renderDisplay } from '@/tachograph/display';
import { menuPosition, type Button, type MenuItemId } from '@/tachograph/types';

const run = (sim: SimState, ...actions: SimAction[]) => actions.reduce(simReducer, sim);
const press = (...b: Button[]): SimAction[] => b.map((button) => ({ type: 'PRESS', button }));

/** Inserta la tarjeta A y completa el procedimiento (sin entrada manual previa). */
function withCard(sim = createInitialSim()): SimState {
  // Bienvenida → última retirada (primer uso) → país de inicio → comunidad autónoma
  return run(sim, { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK', 'OK', 'OK', 'OK'));
}

describe('simulador: tarjeta y actividades', () => {
  it('inserción de tarjeta: bienvenida → última retirada → país de inicio → listo para conducir', () => {
    let s = run(createInitialSim(), { type: 'INSERT_CARD', cardId: 'card-a' });
    expect(s.device.screen.kind).toBe('WELCOME');
    s = run(s, ...press('OK'));
    expect(s.device.screen.kind).toBe('LAST_WITHDRAWAL');
    expect(lcdPlain(renderDisplay(s).lines[1])).toContain('primer uso');
    s = run(s, ...press('OK'));
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'start' });
    s = run(s, ...press('OK'));
    // España: se pide la comunidad autónoma
    expect(s.device.screen).toMatchObject({ kind: 'REGION', purpose: 'start' });
    expect(lcdPlain(renderDisplay(s).lines[1])).toContain('Andalucía');
    s = run(s, ...press('UP')); // la lista es circular: ▲ desde la primera lleva a la última (País Vasco)
    s = run(s, ...press('UP', 'UP', 'UP')); // Navarra, Murcia, Madrid
    s = run(s, ...press('OK'));
    expect(s.device.screen.kind).toBe('STANDARD');
    expect(s.device.notice?.text).toBe('Listo para conducir');
    expect(s.log.at(-1)?.text).toBe('País de inicio: España (Madrid)');
    expect(s.log.map((l) => l.kind)).toEqual(['CARD_IN', 'COUNTRY_START']);
  });

  it('no permite insertar tarjeta con el vehículo en marcha', () => {
    const s = run(createInitialSim(), { type: 'SET_MOVING', moving: true }, ...press('OK'), { type: 'INSERT_CARD', cardId: 'card-a' });
    expect(s.device.insertedCardId).toBeNull();
    expect(s.device.notice?.text).toMatch(/Detenga/);
  });

  it('botón de actividad cicla WORK → AVAILABILITY → REST y registra', () => {
    let s = withCard();
    expect(s.device.selected).toBe('REST');
    s = run(s, ...press('ACTIVITY'));
    expect(s.device.selected).toBe('WORK');
    s = run(s, { type: 'ADVANCE_BY', ms: 30 * MINUTE }, ...press('ACTIVITY'));
    expect(s.device.selected).toBe('AVAILABILITY');
    s = run(s, { type: 'ADVANCE_BY', ms: 10 * MINUTE });
    const evs = driverEvents(s.timeline, 'card-a');
    expect(evs.map((e) => e.activity)).toEqual(['WORK', 'AVAILABILITY']);
    expect(deriveSummary(s).today.WORK).toBe(30 * MINUTE);
  });

  it('el movimiento registra conducción y al detenerse pasa a otros trabajos', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: 2 * HOUR });
    expect(deriveSummary(s).recorded).toBe('DRIVING');
    expect(s.device.selected).toBe('REST'); // seleccionado ≠ registrado
    s = run(s, { type: 'SET_MOVING', moving: false });
    expect(deriveSummary(s).recorded).toBe('WORK');
    expect(deriveSummary(s).today.DRIVING).toBe(2 * HOUR);
  });

  it('no permite cambiar actividad en marcha', () => {
    const s = run(withCard(), { type: 'SET_MOVING', moving: true }, ...press('ACTIVITY'));
    expect(s.device.selected).toBe('REST');
  });

  it('aviso a 4 h 15 y a 4 h 30 con instantes exactos, aunque se salte de golpe', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true });
    const start = s.clock.now;
    s = run(s, { type: 'ADVANCE_BY', ms: 5 * HOUR });
    const warns = s.log.filter((l) => l.kind === 'WARNING');
    expect(warns.map((w) => w.at - start)).toEqual([255 * MINUTE, 270 * MINUTE]);
    expect(s.device.warning?.code).toBe('CONT_DRIVING_EXCEEDED');
    s = run(s, ...press('OK'));
    expect(s.device.warning).toBeNull();
  });

  it('pausa de 45 min reinicia el contador mostrado', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: 4 * HOUR });
    s = run(s, { type: 'SET_MOVING', moving: false }, ...press('ACTIVITY', 'ACTIVITY'));
    expect(s.device.selected).toBe('REST');
    s = run(s, { type: 'ADVANCE_BY', ms: 45 * MINUTE });
    expect(deriveSummary(s).continuous?.drivingSinceBreakMs).toBe(0);
  });

  it('saltar al siguiente evento se detiene en el umbral de 4 h 15', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true });
    const start = s.clock.now;
    s = run(s, { type: 'JUMP_NEXT_EVENT' });
    expect(s.clock.now - start).toBe(255 * MINUTE);
  });

  it('retirada pide país y guarda la última retirada', () => {
    let s = run(withCard(), { type: 'ADVANCE_BY', ms: HOUR }, ...press('EJECT'));
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'end' });
    s = run(s, ...press('OK'));
    expect(s.device.screen).toMatchObject({ kind: 'REGION', purpose: 'end' });
    s = run(s, ...press('OK'));
    expect(s.device.screen).toMatchObject({ kind: 'WITHDRAW_PRINT', yes: false });
    expect(lcdPlain(renderDisplay(s).lines[0])).toContain('¿Imprimir 24 h?');
    s = run(s, ...press('OK'));
    expect(s.device.insertedCardId).toBeNull();
    expect(s.device.printout ?? null).toBeNull();
    expect(s.cards['card-a']!.lastWithdrawalAt).toBe(s.clock.now);
  });

  it('retirada con impresión: el ticket sale antes de expulsar la tarjeta', () => {
    let s = run(withCard(), { type: 'ADVANCE_BY', ms: HOUR }, ...press('EJECT', 'OK', 'OK', 'UP'));
    expect(s.device.screen).toMatchObject({ kind: 'WITHDRAW_PRINT', yes: true });
    s = run(s, ...press('OK'));
    expect(s.device.insertedCardId).toBeNull();
    expect(s.device.printout?.lines).toContain('IMPRESIÓN DIARIA (24 h)');
    expect(s.device.printout?.lines).toContain('Alex Prácticas');
    expect(s.log.map((l) => l.kind).slice(-3)).toEqual(['COUNTRY_END', 'PRINTOUT', 'CARD_OUT']);
  });

  it('✕ en «¿Imprimir 24 h?» vuelve al país de fin; ✕ en el país cancela la retirada', () => {
    let s = run(withCard(), ...press('EJECT', 'OK', 'BACK'));
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'end' });
    s = run(s, ...press('BACK'));
    expect(s.device.screen.kind).toBe('STANDARD');
    expect(s.device.insertedCardId).toBe('card-a');
  });

  it('no se puede retirar la tarjeta con el vehículo en marcha', () => {
    const s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 50 }, ...press('EJECT'));
    expect(s.device.screen.kind).toBe('STANDARD');
    expect(s.device.notice?.text).toBe('Detenga el vehículo para retirar la tarjeta');
  });

  it('impresión diaria desde la impresora', () => {
    expect(run(createInitialSim(), { type: 'PRINT_DAILY' }).device.notice?.text).toBe('Inserte una tarjeta para imprimir');
    const s = run(withCard(), { type: 'PRINT_DAILY' }, { type: 'PRINT_DAILY' });
    expect(s.device.printout?.seq).toBe(2);
    expect(s.device.insertedCardId).toBe('card-a');
  });

  it('entrada manual del periodo sin tarjeta', () => {
    let s = run(withCard(), { type: 'ADVANCE_BY', ms: HOUR }, ...press('EJECT', 'OK', 'OK', 'OK'));
    const withdrawnAt = s.clock.now;
    s = run(s, { type: 'ADVANCE_BY', ms: 10 * HOUR }, { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK'));
    expect(s.device.screen.kind).toBe('LAST_WITHDRAWAL');
    s = run(s, ...press('OK'));
    expect(s.device.screen.kind).toBe('MANUAL_ASK');
    // SÍ → actividad (descanso) → hora → minutos (fin = inserción) → país y comunidad de comienzo → confirmar
    s = run(s, ...press('OK', 'OK', 'OK', 'OK'));
    // Tras las entradas manuales: país (y comunidad) de comienzo y confirmación
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'manual-start' });
    expect(lcdPlain(renderDisplay(s).lines[0])).toContain('País comienzo');
    s = run(s, ...press('OK'));
    expect(s.device.screen).toMatchObject({ kind: 'REGION', purpose: 'manual-start' });
    s = run(s, ...press('BACK'));
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'manual-start' });
    s = run(s, ...press('OK', 'DOWN', 'OK'));
    expect(s.device.screen.kind).toBe('MANUAL_CONFIRM');
    s = run(s, ...press('OK'));
    expect(s.device.screen.kind).toBe('STANDARD');
    expect(s.device.notice?.text).toBe('Listo para conducir');
    expect(s.log.at(-1)?.text).toBe('País de inicio: España (Aragón)');
    const manual = driverEvents(s.timeline, 'card-a').filter((e) => e.source === 'manual');
    expect(manual).toHaveLength(1);
    expect(manual[0]).toMatchObject({ activity: 'REST', start: withdrawnAt, end: withdrawnAt + 10 * HOUR });
  });

  it('entrada manual con dos segmentos (trabajo 1 h + descanso)', () => {
    let s = run(withCard(), ...press('EJECT', 'OK', 'OK', 'OK'));
    const w = s.clock.now;
    s = run(s, { type: 'ADVANCE_BY', ms: 3 * HOUR }, { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK', 'OK', 'OK'));
    // actividad: DOWN → otros trabajos; OK → hora: DOWN ×2 = −2 h (1 h tras la retirada); OK → minutos; OK
    s = run(s, ...press('DOWN', 'OK', 'DOWN', 'DOWN', 'OK'));
    expect(s.device.screen).toMatchObject({ kind: 'MANUAL_EDIT', field: 'minute' });
    s = run(s, ...press('OK'));
    expect(s.device.screen).toMatchObject({ kind: 'MANUAL_EDIT', field: 'activity' });
    // Segundo tramo: descanso hasta la inserción → país y comunidad de comienzo → confirmar
    s = run(s, ...press('OK', 'OK', 'OK', 'OK', 'OK', 'OK'));
    expect(s.device.screen.kind).toBe('STANDARD');
    const manual = driverEvents(s.timeline, 'card-a').filter((e) => e.source === 'manual');
    expect(manual.map((e) => [e.activity, (e.end! - e.start) / HOUR])).toEqual([['WORK', 1], ['REST', 2]]);
    expect(manual[0]!.start).toBe(w);
  });

  it('la pantalla estándar refleja actividad y contadores', () => {
    const s = run(withCard(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: 90 * MINUTE }, { type: 'DISMISS_NOTICE' });
    const d = renderDisplay(s);
    // Estándar: hora local, modo, velocidad; ranura 1 (tarjeta y actividad), cuentakilómetros y ranura 2
    expect(lcdPlain(d.lines[0])).toBe('08:30⊙ ⛟      80km/h'); // 07:30 UTC = 08:30 hora local (Madrid)
    expect(lcdPlain(d.lines[1])).toBe('1▣◉   248430.0km  -2');
    // ▼ Tiempos del conductor (req. 160): conducción continua y descanso acumulado
    const t = renderDisplay(run(s, ...press('DOWN')));
    expect(lcdPlain(t.lines[0]).trimEnd()).toBe('1◉1h30 ▬0h00');
    expect(d.lines.every((l) => lcdLength(l) === 20)).toBe(true);
  });

  it('conducción sin tarjeta genera aviso y se registra sin conductor', () => {
    const s = run(createInitialSim(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: HOUR });
    expect(s.device.warning?.code).toBe('DRIVING_WITHOUT_CARD');
    expect(s.timeline.events[0]).toMatchObject({ activity: 'DRIVING', driverId: null });
  });

  it('el reloj se detiene al final de las dos semanas', () => {
    const s0 = createInitialSim();
    const s = run(s0, { type: 'SET_SPEED', speed: 60 }, { type: 'ADVANCE_BY', ms: 30 * 24 * HOUR });
    expect(s.clock.now).toBe(s0.scenario.endsAt);
    expect(s.clock.speed).toBe(0);
  });
});

describe('simulador: calendario', () => {
  it('cambio de semana: el acumulado semanal se reinicia el lunes 00:00 local', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: 2 * HOUR }, { type: 'SET_MOVING', moving: false });
    s = run(s, ...press('ACTIVITY', 'ACTIVITY', 'OK')); // a descanso (y confirmar aviso si lo hubiera)
    s = run(s, { type: 'ADVANCE_TO', at: s.scenario.weekOneStart + 7 * 24 * HOUR + HOUR });
    const sum = deriveSummary(s);
    expect(sum.weekIndex).toBe(2);
    expect(sum.week.DRIVING).toBe(0);
    expect(sum.twoWeeks.DRIVING).toBe(2 * HOUR);
  });

  it('cálculo en UTC: el día del cambio de hora en España (29/03/2026) sigue durando 24 h', () => {
    let s = withCard(createInitialSim(Date.UTC(2026, 2, 25, 12)));
    expect(s.scenario.timeZone).toBe('UTC');
    expect(s.scenario.weekOneStart).toBe(Date.UTC(2026, 2, 23));
    s = run(s, { type: 'ADVANCE_TO', at: Date.UTC(2026, 2, 30, 10) });
    const dayStart = startOfZonedDay(Date.UTC(2026, 2, 29, 12), s.scenario.timeZone);
    const dayEnd = addZonedDays(dayStart, 1, s.scenario.timeZone);
    expect(dayEnd - dayStart).toBe(24 * HOUR);
    expect(sumActivities(driverEvents(s.timeline, 'card-a'), dayStart, dayEnd, s.clock.now).REST).toBe(24 * HOUR);
  });

  it('la semana normativa empieza el lunes 00:00 UTC (domingo 23:30 UTC aún es semana 1)', () => {
    let s = withCard();
    s = run(s, { type: 'ADVANCE_TO', at: s.scenario.weekOneStart + 7 * 24 * HOUR - 30 * MINUTE });
    expect(deriveSummary(s).weekIndex).toBe(1);
    s = run(s, { type: 'ADVANCE_BY', ms: 30 * MINUTE });
    expect(deriveSummary(s).weekIndex).toBe(2);
  });

  it('la pantalla muestra la hora UTC y la local como referencia', () => {
    const s = run(withCard(), { type: 'DISMISS_NOTICE' }, ...press('UP'));
    const d = renderDisplay(s);
    expect(lcdPlain(d.lines[0])).toBe('06:00U           UTC');
    expect(lcdPlain(d.lines[1])).toBe('07:00⊙         local');
  });
});

describe('simulador: avisos de la Fase 2', () => {
  /** Conduce `min` minutos y confirma los avisos que aparezcan. */
  const drive = (s: SimState, min: number) =>
    run(s, { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: min * MINUTE }, { type: 'SET_MOVING', moving: false }, ...press('OK'));
  const pause = (s: SimState, min: number) => {
    let x = s;
    while (x.device.selected !== 'REST') x = run(x, ...press('ACTIVITY'));
    return run(x, { type: 'ADVANCE_BY', ms: min * MINUTE });
  };
  const codes = (s: SimState) => s.log.filter((l) => l.kind === 'WARNING').map((l) => l.text.split(':')[0]);

  it('la ampliación a 10 h avisa como información y al llegar a 10 h avisa del límite', () => {
    let s = withCard();
    s = pause(drive(s, 270), 45);
    s = pause(drive(s, 270), 45);
    s = drive(s, 30);
    expect(codes(s)).toContain('Ampliación a 10 h en uso');
    s = drive(s, 45);
    expect(codes(s)).toContain('Límite de conducción diaria alcanzado');
    const exceeded = s.log.find((l) => l.text.startsWith('Límite de conducción diaria alcanzado'))!;
    expect(exceeded.at - s.scenario.startsAt).toBe((270 + 45 + 270 + 45 + 60) * MINUTE);
  });

  it('sin descanso, avisa de la hora de iniciar el descanso diario normal y del límite', () => {
    let s = withCard();
    s = run(s, ...press('ACTIVITY')); // otros trabajos
    s = run(s, { type: 'ADVANCE_BY', ms: 16 * HOUR }, ...press('OK'));
    const rest = s.log.filter((l) => l.text.includes('descanso diario') || l.text.includes('Descanso diario'));
    expect(rest.map((l) => l.at - s.scenario.startsAt)).toEqual([13 * HOUR, 15 * HOUR]);
  });

  it('«siguiente evento» se detiene en los hitos de un descanso en curso', () => {
    let s = pause(drive(withCard(), 60), 1);
    const start = s.clock.now - MINUTE;
    s = run(s, { type: 'JUMP_NEXT_EVENT' });
    expect(s.clock.now - start).toBe(15 * MINUTE);
    s = run(s, { type: 'JUMP_NEXT_EVENT' }, { type: 'JUMP_NEXT_EVENT' });
    expect(s.clock.now - start).toBe(45 * MINUTE);
    s = run(s, { type: 'JUMP_NEXT_EVENT' });
    expect(s.clock.now - start).toBe(9 * HOUR);
  });
});

describe('simulador: velocidad del camión y cuentakilómetros', () => {
  it('la velocidad elegida pone el camión en marcha y el cuentakilómetros suma la distancia', () => {
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 60 });
    expect(s.vehicle).toMatchObject({ moving: true, speedKmh: 60 });
    const odo = s.vehicle.odometerKm ?? 248_310;
    s = run(s, { type: 'ADVANCE_BY', ms: 2 * HOUR }, { type: 'DISMISS_NOTICE' });
    expect(s.vehicle.odometerKm! - odo).toBeCloseTo(120, 6);
    s = run(s, { type: 'SET_VEHICLE_SPEED', kmh: 0 });
    expect(s.vehicle.moving).toBe(false);
    expect(deriveSummary(s).recorded).toBe('WORK');
  });

  it('el limitador impide pasar de 90 km/h', () => {
    const s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 140 });
    expect(s.vehicle.speedKmh).toBe(90);
  });
});

describe('simulador: llave de contacto', () => {
  it('sin motor arrancado el acelerador no mueve el camión', () => {
    const s = run(withCard(), { type: 'SET_VEHICLE_SPEED', kmh: 50 });
    expect(s.vehicle.moving).toBe(false);
    expect(s.device.notice?.text).toBe('Arranque el motor con la llave');
  });

  it('0 → I → arranque; quitar el contacto detiene el camión y apaga la retroiluminación', () => {
    let s = withCard();
    expect(renderDisplay(s).backlight).toBe(false);
    s = run(s, { type: 'SET_IGNITION', position: 'on' });
    expect(renderDisplay(s).backlight).toBe(true);
    s = run(s, { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 });
    expect(s.vehicle).toMatchObject({ moving: true, ignition: 'running' });
    s = run(s, { type: 'SET_IGNITION', position: 'off' });
    expect(s.vehicle).toMatchObject({ moving: false, ignition: 'off' });
    expect(s.log.filter((l) => l.kind === 'IGNITION').map((l) => l.text)).toEqual([
      'Contacto puesto (llave en I)',
      'Motor arrancado',
      'Contacto quitado (llave en 0)',
    ]);
  });
});

describe('simulador: nombre del titular', () => {
  it('el alumno pone su nombre en la tarjeta y aparece en la bienvenida', () => {
    let s = run(createInitialSim(), { type: 'RENAME_CARD', cardId: 'card-a', name: '  María   José Núñez ' });
    expect(s.cards['card-a']!.holderName).toBe('María José Núñez');
    expect(s.cards['card-a']!.displayId).toBe('SIM-ES-0000-A1');
    s = run(s, { type: 'INSERT_CARD', cardId: 'card-a' });
    expect(lcdPlain(renderDisplay(s).lines[0])).toBe('1▣ María José Núñez ');
    expect(lcdPlain(renderDisplay(s).lines[1])).toBe('07:00⊙      06:00UTC'); // hora local de Madrid (UTC+1)
  });

  it('rechaza nombres vacíos, demasiado largos o con símbolos', () => {
    const base = createInitialSim();
    for (const name of ['', '   ', 'A'.repeat(19), 'Ana<script>', '1234', 'Pepe@x']) {
      expect(run(base, { type: 'RENAME_CARD', cardId: 'card-a', name })).toBe(base);
    }
    expect(run(base, { type: 'RENAME_CARD', cardId: 'no-existe', name: 'Ana' })).toBe(base);
    expect(run(base, { type: 'RENAME_CARD', cardId: 'card-a', name: "D'Angelo Ruiz-Gil" }).cards['card-a']!.holderName).toBe("D'Angelo Ruiz-Gil");
  });
});

describe('tacógrafo: tiempo de conducción restante', () => {
  it('▼ desde la pantalla principal muestra lo que queda hasta la pausa y hasta el fin de la jornada', () => {
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 }, { type: 'ADVANCE_BY', ms: 75 * MINUTE }, { type: 'DISMISS_NOTICE' });
    s = run(s, ...press('DOWN', 'DOWN'));
    expect(s.device.screen).toMatchObject({ kind: 'STANDARD', page: 2 });
    const d = renderDisplay(s);
    expect(lcdPlain(d.lines[0])).toBe('⊙hasta pausa    3h15'.replace('⊙', lcdPlain('{D}')));
    expect(lcdPlain(d.lines[1])).toContain('fin jornada');
    expect(lcdPlain(d.lines[1])).toMatch(/fin jornada +8h45$/); // límite de 10 h: quedan ampliaciones esta semana
  });
});

describe('tacógrafo: pantalla por defecto sin conducir', () => {
  it('muestra la duración de la actividad actual y no la conducción continua', () => {
    let s = run(withCard(), { type: 'SET_MOVING', moving: true }, { type: 'ADVANCE_BY', ms: HOUR }, { type: 'SET_MOVING', moving: false });
    s = run(s, { type: 'ADVANCE_BY', ms: 20 * MINUTE }, { type: 'DISMISS_NOTICE' }, ...press('DOWN'));
    expect(lcdPlain(renderDisplay(s).lines[0])).toMatch(/^1⚒0h20 ▬0h00/);
  });
});

/** Abre una función del menú: OK → menú principal → OK → función → OK. */
const menuTo = (sim: ReturnType<typeof withCard>, id: MenuItemId) => {
  const { group, index } = menuPosition(id);
  const downs = (n: number) => Array(n).fill('DOWN') as Button[];
  return run(sim, { type: 'DISMISS_NOTICE' }, ...press('OK', ...downs(group), 'OK', ...downs(index), 'OK'));
};

describe('tacógrafo: cruce de frontera y condiciones específicas', () => {
  it('cruce de frontera: país en el que se entra (art. 34.7 R. 165/2014)', () => {
    let s = menuTo(withCard(), 'BORDER');
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'border' });
    expect(lcdPlain(renderDisplay(s).lines[0])).toContain('País: frontera');
    s = run(s, ...press('DOWN', 'DOWN', 'OK')); // Francia
    expect(s.log.at(-1)).toMatchObject({ kind: 'COUNTRY_BORDER', text: 'Cruce de frontera: entrada en Francia' });
    expect(s.device.notice?.text).toBe('País registrado');
  });

  it('ferry/tren: comienzo, pictograma en pantalla y cierre al volver a circular', () => {
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' });
    s = menuTo(s, 'FERRY');
    expect(s.device.condition).toBe('FERRY');
    s = run(s, { type: 'DISMISS_NOTICE' });
    expect(lcdPlain(renderDisplay(s).lines[0])).toContain('⛟⛴');
    s = run(s, { type: 'ADVANCE_BY', ms: 6 * HOUR }, { type: 'SET_VEHICLE_SPEED', kmh: 30 });
    expect(s.device.condition).toBeNull();
    expect(s.conditions).toEqual([expect.objectContaining({ kind: 'FERRY', driverId: 'card-a', end: s.clock.now })]);
    expect(s.log.some((l) => l.text === 'Final de trayecto en transbordador/tren (el vehículo vuelve a circular)')).toBe(true);
  });

  it('ferry/tren: no se puede abrir con el vehículo en marcha y se cierra al extraer la tarjeta', () => {
    const moving = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 50 });
    expect(menuTo(moving, 'FERRY').device.condition ?? null).toBeNull();
    let s = menuTo(withCard(), 'FERRY');
    s = run(s, { type: 'DISMISS_NOTICE' }, ...press('EJECT', 'OK', 'OK', 'OK'));
    expect(s.device.condition).toBeNull();
    expect(s.log.some((l) => l.text.includes('(tarjeta extraída)'))).toBe(true);
  });

  it('fuera de ámbito: sin aviso de conducción sin tarjeta y se cierra al insertar la tarjeta', () => {
    let s = menuTo(createInitialSim(), 'OUT');
    expect(s.device.condition).toBe('OUT');
    s = run(s, { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 60 }, { type: 'ADVANCE_BY', ms: HOUR });
    expect(s.device.warning).toBeNull();
    s = run(s, { type: 'SET_VEHICLE_SPEED', kmh: 0 }, { type: 'INSERT_CARD', cardId: 'card-a' });
    expect(s.device.condition).toBeNull();
  });

  it('el informe aplica el art. 9 con los periodos de ferry registrados', () => {
    /** Confirma los avisos pendientes (bloquean las demás teclas). */
    const calm = (x: SimState) => {
      let y = run(x, { type: 'DISMISS_NOTICE' });
      while (y.device.warning) y = run(y, ...press('OK'));
      return y;
    };
    const rest = (x: SimState, ms: number) => {
      let y = calm(x);
      while (y.device.selected !== 'REST') y = run(y, ...press('ACTIVITY'));
      return run(y, { type: 'ADVANCE_BY', ms });
    };
    const drive = (x: SimState, ms: number) => run(x, { type: 'SET_VEHICLE_SPEED', kmh: 60 }, { type: 'ADVANCE_BY', ms }, { type: 'SET_VEHICLE_SPEED', kmh: 0 });
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' });
    s = drive(s, 4 * HOUR);
    s = rest(s, 45 * MINUTE);
    s = drive(s, 4 * HOUR);
    s = rest(s, 2 * HOUR);
    // Embarque: 30 min conduciendo; a bordo: ferry y descanso 9 h; desembarque 15 min; descanso 1 h
    s = drive(s, 30 * MINUTE);
    s = menuTo(calm(s), 'FERRY');
    expect(s.device.condition).toBe('FERRY');
    s = rest(s, 9 * HOUR);
    s = drive(calm(s), 15 * MINUTE);
    s = rest(s, HOUR);
    const report = complianceFor(s)!;
    expect(report.findings.find((f) => f.ruleId === 'R561-ART9-FERRY')?.detail).toContain('2 veces');
  });

});

describe('reloj rápido', () => {
  it('a ×3600 el reloj se pausa justo en el aviso de 4 h 15 para poder reaccionar', () => {
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 }, { type: 'SET_SPEED', speed: 3600 });
    const start = s.clock.now;
    for (let i = 0; i < 100 && s.clock.speed !== 0; i++) s = run(s, { type: 'TICK', realDeltaMs: 250 });
    expect(s.clock.speed).toBe(0);
    expect(s.device.warning?.code).toBe('CONT_DRIVING_PREWARN');
    expect(s.clock.now - start).toBe(255 * MINUTE);
  });

  it('a ×60 los avisos no pausan el reloj', () => {
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 }, { type: 'ADVANCE_BY', ms: 254 * MINUTE }, { type: 'SET_SPEED', speed: 60 });
    s = run(s, { type: 'TICK', realDeltaMs: 2000 });
    expect(s.device.warning?.code).toBe('CONT_DRIVING_PREWARN');
    expect(s.clock.speed).toBe(60);
  });
});

describe('tacógrafo: avisos de pausa y última retirada', () => {
  it('el aviso de 4 h 15 muestra «1 ¡Pausa!» con los tiempos del conductor', () => {
    const s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 }, { type: 'ADVANCE_BY', ms: 255 * MINUTE });
    const d = renderDisplay(s);
    expect(d.mode).toBe('warning');
    expect(lcdPlain(d.lines[0])).toMatch(/^1 ¡Pausa! +OK$/);
    expect(lcdPlain(d.lines[1]).trimEnd()).toBe('1◉4h15 ▬0h00');
  });

  it('la última retirada se muestra en hora local', () => {
    let s = run(withCard(), { type: 'ADVANCE_BY', ms: HOUR }, ...press('EJECT', 'OK', 'OK', 'OK'));
    s = run(s, { type: 'ADVANCE_BY', ms: HOUR }, { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK'));
    expect(lcdPlain(renderDisplay(s).lines[1])).toBe('▣↑ 02.11.26 08:00⊙  ');
  });
});

describe('tacógrafo: país propuesto', () => {
  it('se propone primero el último país introducido', () => {
    // Inicio en Francia (sin comunidad), retirada: el país de fin propuesto es Francia
    let s = run(createInitialSim(), { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK', 'OK', 'DOWN', 'DOWN', 'OK'));
    expect(s.log.at(-1)?.text).toBe('País de inicio: Francia');
    s = run(s, { type: 'DISMISS_NOTICE' }, ...press('EJECT'));
    expect(s.device.screen).toMatchObject({ kind: 'COUNTRY', purpose: 'end', index: 2 });
    s = run(s, ...press('OK', 'OK'));
    expect(s.log.some((l) => l.text === 'País de fin: Francia')).toBe(true);
  });
});

describe('tacógrafo: menú de dos niveles', () => {
  it('menús principales y funciones; ✕ vuelve al nivel anterior', () => {
    let s = run(withCard(), { type: 'DISMISS_NOTICE' }, ...press('OK'));
    expect(lcdPlain(renderDisplay(s).lines[1])).toContain('Imprimir conduc.1');
    s = run(s, ...press('DOWN', 'OK'));
    expect(s.device.screen).toMatchObject({ kind: 'SUBMENU', group: 1, index: 0 });
    expect(lcdPlain(renderDisplay(s).lines[1])).toContain('País comienzo');
    s = run(s, ...press('BACK'));
    expect(s.device.screen).toMatchObject({ kind: 'MENU', index: 1 });
    s = run(s, ...press('BACK'));
    expect(s.device.screen.kind).toBe('STANDARD');
  });

  it('el menú solo se abre con el vehículo parado', () => {
    const s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 60 }, { type: 'DISMISS_NOTICE' }, ...press('OK'));
    expect(s.device.screen.kind).toBe('STANDARD');
    expect(s.device.notice?.text).toBe('Menú solo con el vehículo parado');
  });

  it('impresión desde el menú y país final sin retirar la tarjeta', () => {
    let s = menuTo(withCard(), 'PRINT_DAY');
    expect(s.device.printout?.lines).toContain('IMPRESIÓN DIARIA (24 h)');
    s = menuTo(s, 'ENTRY_END');
    s = run(s, ...press('OK', 'OK'));
    expect(s.log.at(-1)).toMatchObject({ kind: 'COUNTRY_END', text: 'País de fin: España (Andalucía)' });
    expect(s.device.insertedCardId).toBe('card-a');
  });
});

describe('tacógrafo: amplitud de la jornada', () => {
  it('▼ ×3: tiempo que queda de jornada con descanso normal (13 h) y reducido (15 h)', () => {
    // La jornada empieza al insertar a las 06:00 UTC; 4 h después quedan 9 h (13 h) y 11 h (15 h)
    let s = run(withCard(), { type: 'SET_IGNITION', position: 'start' }, { type: 'SET_VEHICLE_SPEED', kmh: 80 }, { type: 'ADVANCE_BY', ms: 4 * HOUR });
    s = run(s, { type: 'SET_VEHICLE_SPEED', kmh: 0 });
    while (s.device.warning) s = run(s, ...press('OK'));
    s = run(s, { type: 'DISMISS_NOTICE' }, ...press('DOWN', 'DOWN', 'DOWN'));
    const d = renderDisplay(s);
    expect(lcdPlain(d.lines[0])).toBe('Jornada 13h     9h00');
    expect(lcdPlain(d.lines[1])).toBe('Reducida 15h   11h00');
  });
});
