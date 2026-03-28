import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let configService: ConfigService;

  const mockPrisma = {
    user: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    subscription: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockStripe = {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    subscriptions: { retrieve: jest.fn(), cancel: jest.fn(), update: jest.fn() },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        STRIPE_STARTER_PRICE_ID: 'price_test_123',
      };
      return map[key];
    }),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPlans', () => {
    it('should return plans with correct keys', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(2);
      expect(plans[0].key).toBe(Plan.FREE);
      expect(plans[1].key).toBe(Plan.STARTER);
    });

    it('should return FREE plan with price 0', () => {
      const plans = service.getPlans();
      expect(plans[0].price).toBe(0);
    });

    it('should return STARTER plan with correct price', () => {
      const plans = service.getPlans();
      expect(plans[1].price).toBe(9.9);
    });

    it('should return STARTER plan with priceId from config', () => {
      const plans = service.getPlans();
      expect(plans[1].priceId).toBe('price_test_123');
      expect(configService.get).toHaveBeenCalledWith('STRIPE_STARTER_PRICE_ID');
    });

    it('should return limits for each plan', () => {
      const plans = service.getPlans();
      expect(plans[0].limits).toEqual({ maxPages: 1, maxLinksPerPage: 3 });
      expect(plans[1].limits).toEqual({ maxPages: 5, maxLinksPerPage: 10 });
    });

    it('should return features for each plan', () => {
      const plans = service.getPlans();
      expect(plans[0].features).toEqual(['1 página', '3 links por página']);
      expect(plans[1].features).toEqual(['5 páginas', '10 links por página']);
    });

    it('should return name for each plan', () => {
      const plans = service.getPlans();
      expect(plans[0].name).toBe('Grátis');
      expect(plans[1].name).toBe('Starter');
    });
  });

  describe('getOrCreateStripeCustomer', () => {
    it('should return existing stripeCustomerId if user already has one', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        stripeCustomerId: 'cus_existing',
      });

      const result = await service.getOrCreateStripeCustomer('user-1');
      expect(result).toBe('cus_existing');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('should create a new stripe customer if user has none', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        stripeCustomerId: null,
      });
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });

      const result = await service.getOrCreateStripeCustomer('user-1');
      expect(result).toBe('cus_new');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@test.com',
        name: 'Test',
        metadata: { userId: 'user-1' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeCustomerId: 'cus_new' },
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should throw NotFoundException if no subscription found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.cancelSubscription('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cancel immediately when immediate=true', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: 'sub_123',
      });

      await service.cancelSubscription('user-1', true);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should set cancel_at_period_end when immediate=false', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        stripeSubscriptionId: 'sub_123',
      });

      await service.cancelSubscription('user-1', false);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { cancelAtPeriodEnd: true },
      });
    });
  });

  describe('getUserSubscription', () => {
    it('should return plan and subscription for user', async () => {
      const mockSub = { id: 'sub-1', status: 'ACTIVE' };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        plan: Plan.STARTER,
        subscription: mockSub,
      });

      const result = await service.getUserSubscription('user-1');
      expect(result).toEqual({ plan: Plan.STARTER, subscription: mockSub });
    });
  });

  describe('createCheckoutSession', () => {
    it('should create stripe checkout session and return url', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        stripeCustomerId: 'cus_existing',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      });

      const url = await service.createCheckoutSession(
        'user-1',
        'price_123',
        'https://app.com/success',
        'https://app.com/cancel',
      );

      expect(url).toBe('https://checkout.stripe.com/session_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          mode: 'subscription',
          line_items: [{ price: 'price_123', quantity: 1 }],
          success_url: 'https://app.com/success',
          cancel_url: 'https://app.com/cancel',
        }),
      );
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create billing portal session and return url', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        stripeCustomerId: 'cus_existing',
      });
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal_123',
      });

      const url = await service.createBillingPortalSession(
        'user-1',
        'https://app.com/dashboard',
      );

      expect(url).toBe('https://billing.stripe.com/portal_123');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing',
        return_url: 'https://app.com/dashboard',
      });
    });
  });

  describe('handleCheckoutCompleted', () => {
    const mockSession = {
      metadata: { userId: 'user-1' },
      mode: 'subscription',
      subscription: 'sub_stripe_123',
    } as any;

    it('should upgrade user to STARTER and create subscription', async () => {
      const now = Date.now();
      const anchorSec = Math.floor(now / 1000) - 10 * 24 * 60 * 60; // 10 days ago
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_stripe_123',
        customer: 'cus_123',
        billing_cycle_anchor: anchorSec,
        items: { data: [{ price: { id: 'price_starter' } }] },
      });
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.handleCheckoutCompleted(mockSession);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_stripe_123');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip if no userId in metadata', async () => {
      await service.handleCheckoutCompleted({ metadata: {}, mode: 'subscription' } as any);
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it('should skip if mode is not subscription', async () => {
      await service.handleCheckoutCompleted({
        metadata: { userId: 'user-1' },
        mode: 'payment',
      } as any);
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated', () => {
    const now = Date.now();
    const anchorSec = Math.floor(now / 1000) - 5 * 24 * 60 * 60;

    const makeSub = (status: string) =>
      ({
        id: 'sub_stripe_123',
        status,
        billing_cycle_anchor: anchorSec,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_starter' } }] },
      }) as any;

    it('should update subscription status to ACTIVE', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
      });

      await service.handleSubscriptionUpdated(makeSub('active'));

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_stripe_123' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should downgrade user to FREE when status is canceled', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
      });

      await service.handleSubscriptionUpdated(makeSub('canceled'));

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELED' }),
        }),
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { plan: Plan.FREE },
      });
    });

    it('should skip if subscription not found in db', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleSubscriptionUpdated(makeSub('active'));

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('should map past_due status correctly', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
      });

      await service.handleSubscriptionUpdated(makeSub('past_due'));

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAST_DUE' }),
        }),
      );
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should delete subscription and downgrade user to FREE', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
      });
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.handleSubscriptionDeleted({
        id: 'sub_stripe_123',
      } as any);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip if subscription not found in db', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleSubscriptionDeleted({
        id: 'sub_stripe_123',
      } as any);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
