import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import type { CreateUserInput, CreateUserResponse, PaginatedResponse, Role, User, UserQuery } from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginatedResponse, toSkipTake } from '../common/pagination';

const SALT_ROUNDS = 10;

/** 9 random bytes -> 12 base64url characters (no padding, URL/copy-safe) —
 *  plenty of entropy for a password that must be changed on first use. */
function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    status: true,
    createdAt: true,
    avatarUrl: true,
    mustChangePassword: true,
  } as const;

  /**
   * Admin-only onboarding for a new dashboard account (ADMIN/STAFF — never
   * CUSTOMER, that's the shop's own self-registration). The email's company
   * domain is already enforced by CreateUserSchema's zod refine; this also
   * re-checks uniqueness the same way auth.service.ts's register() does,
   * since the DB unique constraint alone would surface as an opaque 500.
   * The generated password is returned in plaintext exactly once — it is
   * never stored or retrievable again after this response.
   */
  async create(input: CreateUserInput): Promise<CreateUserResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        mustChangePassword: true,
      },
      select: this.publicSelect,
    });

    return { user, temporaryPassword };
  }

  async findAll(query: UserQuery): Promise<PaginatedResponse<User>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.publicSelect,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return toPaginatedResponse(users, total, query);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: this.publicSelect });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateRole(id: string, role: Role) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: this.publicSelect,
    });
  }

  async block(id: string, actingUserId: string) {
    this.assertNotSelf(id, actingUserId, 'block');
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'BLOCKED' }, select: this.publicSelect });
  }

  async unblock(id: string) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, select: this.publicSelect });
  }

  /**
   * Hard delete: the row is actually removed. `Cart.userId`, `Address.userId`
   * and `Order.userId` all have `ON DELETE SET NULL` (see the init
   * migration), so this can't fail on a foreign-key error — but a past
   * order's `userId` going null would otherwise erase every trace of who
   * placed it (no linked account AND no guestEmail, since that field is only
   * ever set for an actual guest checkout). So before deleting, this
   * backfills `guestEmail` on that user's own orders with their email —
   * safe to do unconditionally, since an order with a `userId` set never
   * has a `guestEmail` already (checkout.ts only sets one or the other).
   * The shipping name isn't at risk either way: `Order.address` is its own
   * row with its own `fullName`, untouched by any of this.
   */
  async remove(id: string, actingUserId: string) {
    this.assertNotSelf(id, actingUserId, 'delete');
    const user = await this.findById(id);
    await this.prisma.$transaction([
      this.prisma.order.updateMany({ where: { userId: id }, data: { guestEmail: user.email } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }

  private assertNotSelf(targetId: string, actingUserId: string, action: 'block' | 'delete') {
    if (targetId === actingUserId) {
      throw new BadRequestException(`You cannot ${action} your own account.`);
    }
  }
}
