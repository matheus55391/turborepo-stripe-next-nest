import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PLAN_LIMITS } from '@repo/shared/types';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  getPlans() {
    return [
      {
        key: Plan.FREE,
        name: 'Grátis',
        price: 0,
        limits: PLAN_LIMITS[Plan.FREE],
        features: [
          `${PLAN_LIMITS[Plan.FREE].maxPages} página`,
          `${PLAN_LIMITS[Plan.FREE].maxLinksPerPage} links por página`,
        ],
      },
      {
        key: Plan.STARTER,
        name: 'Starter',
        price: 9.9,
        priceId: this.config.get<string>('STRIPE_STARTER_PRICE_ID'),
        limits: PLAN_LIMITS[Plan.STARTER],
        features: [
          `${PLAN_LIMITS[Plan.STARTER].maxPages} páginas`,
          `${PLAN_LIMITS[Plan.STARTER].maxLinksPerPage} links por página`,
        ],
      },
    ];
  }

  // ── Stripe Customer ──────────────────────────────────────────────

  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  // ── Checkout & Portal ─────────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(userId);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });

    return session.url!;
  }

  async createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(userId);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async cancelSubscription(userId: string, immediate = false) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura encontrada');
    }

    if (immediate) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );

      await this.prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });
    }

    this.logger.log(
      `User ${userId} requested cancellation (immediate=${immediate})`,
    );
  }

  // ── Subscription Queries ──────────────────────────────────────

  async getUserSubscription(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { subscription: true },
    });

    return {
      plan: user.plan,
      subscription: user.subscription,
    };
  }

  private getPeriodDates(sub: Stripe.Subscription) {
    const anchorMs = sub.billing_cycle_anchor * 1000;
    const now = Date.now();

    const periodEnd = new Date(anchorMs);
    while (periodEnd.getTime() <= now) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);

    return { periodStart, periodEnd };
  }

  // ── Webhook Handlers ──────────────────────────────────────────

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId || session.mode !== 'subscription') return;

    const subscriptionId = session.subscription as string;
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const { periodStart, periodEnd } = this.getPeriodDates(sub);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          plan: Plan.STARTER,
          stripeCustomerId: sub.customer as string,
        },
      }),
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0].price.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0].price.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    this.logger.log(`User ${userId} upgraded to STARTER`);
  }

  async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!subscription) return;

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.INCOMPLETE,
    };

    const status = statusMap[sub.status] ?? SubscriptionStatus.ACTIVE;

    const { periodStart, periodEnd } = this.getPeriodDates(sub);

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status,
        stripePriceId: sub.items.data[0].price.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });

    // Downgrade to FREE if canceled
    if (sub.status === 'canceled') {
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: { plan: Plan.FREE },
      });
      this.logger.log(`User ${subscription.userId} downgraded to FREE`);
    }
  }

  async handleSubscriptionDeleted(sub: Stripe.Subscription) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!subscription) return;

    await this.prisma.$transaction([
      this.prisma.subscription.delete({
        where: { stripeSubscriptionId: sub.id },
      }),
      this.prisma.user.update({
        where: { id: subscription.userId },
        data: { plan: Plan.FREE },
      }),
    ]);

    this.logger.log(
      `User ${subscription.userId} subscription deleted, downgraded to FREE`,
    );
  }
}
