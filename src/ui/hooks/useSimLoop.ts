import { useEffect } from 'react';
import { useSimStore } from '@/simulator/store';

/** Bucle de animación: convierte tiempo real en ticks del reloj virtual. */
export function useSimLoop(): void {
  const speed = useSimStore((s) => s.sim.clock.speed);
  const dispatch = useSimStore((s) => s.dispatch);

  useEffect(() => {
    if (speed === 0) return;
    let last = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      // Si la pestaña estuvo oculta, no recuperar el tiempo perdido de golpe.
      const delta = Math.min(t - last, 250);
      last = t;
      dispatch({ type: 'TICK', realDeltaMs: delta });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speed, dispatch]);

  // Guardado periódico durante la reproducción y al cerrar.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (useSimStore.getState().dirty) useSimStore.getState().persist();
    }, 2000);
    const onHide = () => useSimStore.getState().persist();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  // Los mensajes informativos desaparecen tras 2,5 s reales.
  const noticeSeq = useSimStore((s) => s.sim.device.notice?.seq);
  useEffect(() => {
    if (noticeSeq === undefined) return;
    const id = window.setTimeout(() => dispatch({ type: 'DISMISS_NOTICE' }), 2500);
    return () => window.clearTimeout(id);
  }, [noticeSeq, dispatch]);
}
