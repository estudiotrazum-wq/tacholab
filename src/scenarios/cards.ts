/** Tarjetas de conductor FICTICIAS. Nunca se solicitan números reales. */
export interface FictionalCard {
  id: string;
  /** Identificador mostrado, deliberadamente con prefijo SIM para no parecer real. */
  displayId: string;
  holderName: string;
  /** Último instante de retirada (para ofrecer la entrada manual). */
  lastWithdrawalAt: number | null;
}

export const DEFAULT_CARDS: readonly FictionalCard[] = [
  { id: 'card-a', displayId: 'SIM-ES-0000-A1', holderName: 'Alex Prácticas', lastWithdrawalAt: null },
  { id: 'card-b', displayId: 'SIM-ES-0000-B2', holderName: 'Sam Formación', lastWithdrawalAt: null },
];
