import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Real integration test: boots the actual Nest app (all real modules, real
 * global guards/pipes/filters — same wiring as main.ts) against a dedicated
 * `plastimatic_test` Postgres database, and drives it over real HTTP with
 * supertest. Nothing here is mocked — this is what tells us the JWT guard,
 * the RolesGuard, the zod validation pipe, and the actual Prisma queries all
 * agree with each other, which the mocked unit tests can't.
 */
describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  const ADMIN_EMAIL = 'e2e.admin@plasti-matic.com';
  const ADMIN_PASSWORD = 'AdminPassword123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Seed one admin directly (there's no HTTP path to create the very
    // first admin — POST /users itself requires an admin token) and log in
    // through the real endpoint below to get a genuine JWT.
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: { email: ADMIN_EMAIL, passwordHash, firstName: 'E2E', lastName: 'Admin', role: 'ADMIN' },
      update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    });
    createdEmails.push(ADMIN_EMAIL);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  async function loginAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    return res.body.accessToken;
  }

  describe('POST /api/auth/register + /api/auth/login', () => {
    const email = `e2e.customer.${Date.now()}@example.com`;

    it('registers a new customer and returns a usable access token', async () => {
      createdEmails.push(email);
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password: 'CustomerPass123', firstName: 'E2E', lastName: 'Customer' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('rejects a login with the wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'totally-wrong' })
        .expect(401);
    });
  });

  describe('POST /api/users (admin-only, domain-restricted)', () => {
    it('rejects with no auth token at all', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .send({ email: 'x@plasti-matic.com', firstName: 'X', lastName: 'Y', role: 'STAFF' })
        .expect(401);
    });

    it('rejects a CUSTOMER-role token — the RolesGuard, not just the JwtAuthGuard, is exercised', async () => {
      const email = `e2e.customer2.${Date.now()}@example.com`;
      createdEmails.push(email);
      const register = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password: 'CustomerPass123', firstName: 'E2E', lastName: 'Customer2' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${register.body.accessToken}`)
        .send({ email: 'x@plasti-matic.com', firstName: 'X', lastName: 'Y', role: 'STAFF' })
        .expect(403);
    });

    // The exact French rejection wording is a schema-level concern, already
    // covered by CreateUserSchema's own unit test in packages/shared — the
    // HttpExceptionFilter collapses every zod issue down to a generic
    // "Validation failed" before it reaches the client (the dashboard never
    // hits this path in practice, since its form uses the same schema via
    // zodResolver and blocks a bad domain before submitting). What this
    // integration test is actually responsible for is confirming the full
    // pipeline — guard, pipe, controller, service — really does reject it.
    it('rejects a non-company email domain', async () => {
      const token = await loginAsAdmin();
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'outsider@gmail.com', firstName: 'Out', lastName: 'Sider', role: 'STAFF' })
        .expect(400);
    });

    it('creates a STAFF account and returns the one-time temporary password', async () => {
      const token = await loginAsAdmin();
      const email = `e2e.staff.${Date.now()}@plasti-matic.com`;
      createdEmails.push(email);

      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email, firstName: 'New', lastName: 'Staff', role: 'STAFF' })
        .expect(201);

      expect(res.body.user.email).toBe(email);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(typeof res.body.temporaryPassword).toBe('string');
      expect(res.body.temporaryPassword.length).toBeGreaterThan(0);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // And the temp password genuinely logs the new account in.
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: res.body.temporaryPassword })
        .expect(200);
    });
  });
});
