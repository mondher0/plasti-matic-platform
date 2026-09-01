import { describe, expect, it } from 'vitest';
import { CheckoutSchema } from '../orders.schema';

const address = {
  fullName: 'Client Test',
  phone: '0555000000',
  line1: '1 Rue Test',
  city: 'Alger',
  postalCode: '16000',
  country: 'Algérie',
};

describe('CheckoutSchema', () => {
  // Regression test for a real bug hit this session: `.optional()` alone only
  // accepts `undefined`, not `''` — the shop form defaults guestEmail to ''
  // and never even renders the field for a logged-in customer, so without
  // the `.or(z.literal(''))` escape hatch checkout was silently broken for
  // every logged-in user.
  it('accepts an empty-string guestEmail (logged-in customer checkout)', () => {
    const result = CheckoutSchema.safeParse({ address, guestEmail: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid guestEmail (guest checkout)', () => {
    const result = CheckoutSchema.safeParse({ address, guestEmail: 'guest@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed, non-empty guestEmail', () => {
    const result = CheckoutSchema.safeParse({ address, guestEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});
