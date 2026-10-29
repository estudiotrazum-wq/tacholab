import { useEffect } from 'react';
import { DEFAULT_SPEED_KMH } from '@/simulator/engine';
import type { SimState } from '@/simulator/state';
import { useSimStore } from '@/simulator/store';
import { useUiStore } from '../uiStore';
import { sound } from './sound';

const kmhOf = (s: SimState) => (s.vehicle.moving ? (s.vehicle.speedKmh ?? DEFAULT_SPEED_KMH) : 0);

/** Conecta el sonido con la simulación y con las preferencias. Se monta una vez en la aplicación. */
export function useSound(): void {
  useEffect(() => {
    // El audio solo puede empezar tras un gesto del usuario.
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);

    const applySettings = () => {
      const u = useUiStore.getState();
      sound.configure({ sfx: u.sfxOn, music: u.musicOn, volume: u.volume, musicVolume: u.musicVolume });
    };
    applySettings();
    const unsubUi = useUiStore.subscribe(applySettings);

    // Al crear el audio, si el motor ya estaba en marcha (estado guardado) se oye el ralentí.
    sound.whenUnlocked(() => {
      const sim = useSimStore.getState().sim;
      if (sim.vehicle.ignition === 'running') {
        sound.engineStart();
        sound.engineSpeed(kmhOf(sim));
      }
    });

    const unsubSim = useSimStore.subscribe((st, prevSt) => {
      const s = st.sim;
      const p = prevSt.sim;
      if (s === p) return;
      // Un escenario o un reinicio distinto: el motor se ajusta sin efectos.
      if (s.scenario.id !== p.scenario.id || s.clock.now < p.clock.now) {
        if (s.vehicle.ignition !== 'running') sound.engineStop();
        return;
      }
      const ig = s.vehicle.ignition ?? 'off';
      const pig = p.vehicle.ignition ?? 'off';
      if (ig !== pig) {
        sound.keyClick();
        if (ig === 'running') sound.engineStart();
        else sound.engineStop();
      }
      const kmh = kmhOf(s);
      if (kmh !== kmhOf(p)) sound.engineSpeed(kmh);
      if (s.device.insertedCardId !== p.device.insertedCardId) sound.card(s.device.insertedCardId ? 'in' : 'out');
      if (s.device.warning && s.device.warning !== p.device.warning) sound.warning();
      if ((s.device.printout?.seq ?? 0) > (p.device.printout?.seq ?? 0)) sound.printer();
    });

    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      unsubUi();
      unsubSim();
    };
  }, []);
}
