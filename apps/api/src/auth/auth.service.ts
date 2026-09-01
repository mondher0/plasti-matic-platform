import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResponse, AuthUser, ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 10;

interface UserRecord {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'CUSTOMER',
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // A soft-deleted account is treated as if it doesn't exist — same
    // generic message as a wrong email, so we don't reveal it ever existed.
    if (!user || user.status === 'DELETED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('Your account has been blocked. Please contact the administrator.');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Self-service profile edit — any authenticated role (staff or customer).
   * Only the supplied fields change; email uniqueness is re-checked the same
   * way register() does, since the DB unique constraint alone would surface
   * as an opaque 500 rather than a clean 409.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    if (input.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('An account with this email already exists');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
      },
    });

    return this.toAuthUser(user);
  }

  /**
   * Self-service password change — requires the current password, same
   * bcrypt check `login()` uses. Also clears `mustChangePassword`: this is
   * the one place an admin-created account's forced-change flag can ever
   * turn off (see users.service.ts's `create()`, which turns it on) —
   * returning the updated `AuthUser` (rather than a bare ack) lets the
   * frontend refresh its in-memory user immediately, so a dashboard's
   * "you must change your password" redirect guard releases without
   * needing a reload or re-login.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const currentMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return this.toAuthUser(updated);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return this.toAuthUser(user);
  }

  private buildAuthResponse(user: UserRecord): AuthResponse {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, user: this.toAuthUser(user) };
  }

  private toAuthUser(user: UserRecord): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
