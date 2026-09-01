import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attempts JWT auth but never rejects the request: `request.user` ends up
 * either the authenticated user or `null`. Used by routes (cart, checkout)
 * that must work for both guests and logged-in customers.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user ?? null) as TUser;
  }
}
