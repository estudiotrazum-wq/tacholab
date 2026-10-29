import type { Activity } from '@/shared/types';

interface IconProps {
  className?: string;
  title?: string;
}

/** Pictogramas propios para las cuatro categorías de actividad. */
export function ActivityIcon({ activity, className = 'h-5 w-5', title }: IconProps & { activity: Activity }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={title ?? activity}>
      {title && <title>{title}</title>}
      {activity === 'DRIVING' && (
        <g {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M3.8 10.5h6.4M13.8 10.5h6.4M12 14v6.3" />
        </g>
      )}
      {activity === 'WORK' && (
        <g {...common}>
          <path d="M5 19 14.5 9.5" />
          <path d="M12.5 5.5 16 4l4 4-1.5 3.5" />
          <path d="M19 19 9.5 9.5" />
          <path d="M11.5 5.5 8 4 4 8l1.5 3.5" />
        </g>
      )}
      {activity === 'AVAILABILITY' && (
        <g {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
          <path d="M4.5 19.5 19.5 4.5" />
        </g>
      )}
      {activity === 'REST' && (
        <g {...common}>
          <path d="M3 18V7M3 14h18v4M21 14v-2.5a2.5 2.5 0 0 0-2.5-2.5H10v5" />
          <circle cx="6.5" cy="11.5" r="1.6" />
        </g>
      )}
    </svg>
  );
}

export function CardIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="6" y="9.5" width="4" height="3.5" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export const ACTIVITY_COLOR: Record<Activity, string> = {
  DRIVING: 'var(--color-act-driving)',
  WORK: 'var(--color-act-work)',
  AVAILABILITY: 'var(--color-act-availability)',
  REST: 'var(--color-act-rest)',
};
