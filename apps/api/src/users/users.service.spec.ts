import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

/** A hand-rolled mock is enough here — we only ever assert on how these
 *  methods were called, never on real Prisma behavior. */
function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    const input = { email: 'new.staff@plasti-matic.com', firstName: 'Amine', lastName: 'Belkacem', role: 'STAFF' as const };

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(input)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates the user with mustChangePassword true and returns the plaintext password once', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'new-user', ...data, status: 'ACTIVE', createdAt: new Date(), avatarUrl: null }),
      );

      const result = await service.create(input);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: input.email, mustChangePassword: true }) }),
      );
      // The hash stored is never the plaintext password itself.
      expect(result.temporaryPassword).not.toBe(prisma.user.create.mock.calls[0][0].data.passwordHash);
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    });
  });

  describe('remove (hard delete)', () => {
    it('refuses to let an admin delete their own account', async () => {
      await expect(service.remove('user-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-user', 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('backfills guestEmail on the user\'s past orders, then deletes the row, in one transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'gone@plasti-matic.com' });
      prisma.$transaction.mockResolvedValue([{ count: 2 }, { id: 'user-1' }]);

      await service.remove('user-1', 'admin-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { guestEmail: 'gone@plasti-matic.com' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});
