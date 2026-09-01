import { describe, expect, it } from 'vitest';
import { CreateUserSchema } from '../users.schema';

const validInput = {
  email: 'new.staff@plasti-matic.com',
  firstName: 'Amine',
  lastName: 'Belkacem',
  role: 'STAFF' as const,
};

describe('CreateUserSchema', () => {
  it('accepts a valid @plasti-matic.com email', () => {
    const result = CreateUserSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects an email from any other domain, with the exact company-only message', () => {
    const result = CreateUserSchema.safeParse({ ...validInput, email: 'new.staff@gmail.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Seules les adresses email de l'entreprise (@plasti-matic.com) peuvent être utilisées",
      );
    }
  });

  it('is case-insensitive on the domain check', () => {
    const result = CreateUserSchema.safeParse({ ...validInput, email: 'new.staff@PLASTI-MATIC.COM' });
    expect(result.success).toBe(true);
  });

  it('only allows ADMIN or STAFF as an assignable role', () => {
    expect(CreateUserSchema.safeParse({ ...validInput, role: 'ADMIN' }).success).toBe(true);
    expect(CreateUserSchema.safeParse({ ...validInput, role: 'CUSTOMER' }).success).toBe(false);
  });
});
