import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  // Hashing once and reusing it keeps the suite fast — bcrypt is
  // deliberately slow, and every test below needs the same known password.
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('CorrectHorse123', 10);
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    const baseUser = {
      id: 'user-1',
      email: 'staff@plastimatic.dz',
      passwordHash: '',
      role: 'STAFF' as const,
      status: 'ACTIVE' as const,
      firstName: 'S',
      lastName: 'T',
      avatarUrl: null,
      mustChangePassword: false,
    };

    it('rejects an unknown email with a generic message', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@plastimatic.dz', password: 'x' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with the same generic message', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      await expect(service.login({ email: baseUser.email, password: 'wrong-password' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a blocked account even with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash, status: 'BLOCKED' });
      await expect(service.login({ email: baseUser.email, password: 'CorrectHorse123' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('treats a soft-deleted account as if it does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash, status: 'DELETED' });
      await expect(service.login({ email: baseUser.email, password: 'CorrectHorse123' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns an access token and the auth user on success', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      const result = await service.login({ email: baseUser.email, password: 'CorrectHorse123' });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe(baseUser.email);
      // The hash must never leak into the response shape.
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        email: 'a@plasti-matic.com',
        firstName: 'A',
        lastName: 'B',
        role: 'STAFF',
        avatarUrl: null,
        mustChangePassword: true,
      });

      await expect(
        service.changePassword('user-1', { currentPassword: 'nope', newPassword: 'NewPassword123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // This is what unblocks an admin-created account's forced-change
    // redirect guard on the frontend — see the comment on changePassword()
    // in auth.service.ts.
    it('clears mustChangePassword after a successful change', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        email: 'a@plasti-matic.com',
        firstName: 'A',
        lastName: 'B',
        role: 'STAFF',
        avatarUrl: null,
        mustChangePassword: true,
      });
      prisma.user.update.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'user-1',
          email: 'a@plasti-matic.com',
          firstName: 'A',
          lastName: 'B',
          role: 'STAFF',
          avatarUrl: null,
          ...data,
        }),
      );

      const result = await service.changePassword('user-1', {
        currentPassword: 'CorrectHorse123',
        newPassword: 'NewPassword123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mustChangePassword: false }) }),
      );
      expect(result.mustChangePassword).toBe(false);
    });
  });
});
