import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface CheckoutLineItem {
  name: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Thin wrapper around the Stripe SDK — no order/business logic here, just
 * "build a Checkout Session" and "verify+parse a webhook payload". Keeps
 * orders.service.ts free of Stripe API shapes.
 */
@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly shopUrl: string;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'));
    this.shopUrl = this.config.get<string>('SHOP_URL', 'http://localhost:5174');
  }

  /**
   * `price_data` line items (rather than pre-created Stripe Products/Prices)
   * since this catalog's products/prices already live in our own DB — no
   * need to mirror them into Stripe separately for a one-off charge.
   */
  async createCheckoutSession(orderId: string, items: CheckoutLineItem[]): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: { name: item.name },
        },
      })),
      metadata: { orderId },
      success_url: `${this.shopUrl}/order-confirmation/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.shopUrl}/checkout?canceled=true`,
    });
  }

  /** Throws if the signature doesn't match — the caller (the webhook
   *  controller) should let that reject the request with a 4xx. */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
