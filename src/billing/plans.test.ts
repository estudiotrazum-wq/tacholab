import { describe, expect, it } from 'vitest';
import { DEFAULT_ENTITLEMENTS, hasFeature, PRICING, formatPrice } from './plans';

describe('permisos por funcionalidad', () => {
  it('el plan gratuito no accede a funciones premium', () => {
    expect(hasFeature(DEFAULT_ENTITLEMENTS, 'tachograph')).toBe(true);
    expect(hasFeature(DEFAULT_ENTITLEMENTS, 'academy-advanced')).toBe(false);
    expect(hasFeature({ plan: 'premium', source: 'server' }, 'academy-advanced')).toBe(true);
  });
  it('los pagos están desactivados y el precio es configurable', () => {
    expect(PRICING.premium.active).toBe(false);
    expect(formatPrice(PRICING.premium.amountCents, PRICING.premium.currency)).toMatch(/12,99/);
  });
});
