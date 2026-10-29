export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

/** Fase del día según la hora local (solo afecta al aspecto del paisaje). */
export function dayPhase(localHour: number): DayPhase {
  if (localHour < 6 || localHour >= 21) return 'night';
  if (localHour < 8) return 'dawn';
  if (localHour < 18) return 'day';
  return 'dusk';
}

export const SKY: Record<DayPhase, { sky: string; ground: string; mountains: [string, string]; haze: string }> = {
  night: { sky: 'linear-gradient(#02040b 0%, #0b1530 70%, #1a2440 100%)', ground: '#0a120f', mountains: ['#0b1324', '#101a2d'], haze: 'rgba(40,60,110,0.35)' },
  dawn: { sky: 'linear-gradient(#27325c 0%, #c0727a 60%, #f6b47a 100%)', ground: '#3d4a33', mountains: ['#4a3f5f', '#5d4f6b'], haze: 'rgba(255,190,140,0.45)' },
  day: { sky: 'linear-gradient(#3f7fc4 0%, #8fbde6 65%, #d6e8f2 100%)', ground: '#5f7d4a', mountains: ['#7f97ad', '#97abbc'], haze: 'rgba(230,240,250,0.55)' },
  dusk: { sky: 'linear-gradient(#1d2450 0%, #8a4a78 55%, #f08a4b 100%)', ground: '#33402c', mountains: ['#3d2f4f', '#55405d'], haze: 'rgba(255,150,100,0.4)' },
};
