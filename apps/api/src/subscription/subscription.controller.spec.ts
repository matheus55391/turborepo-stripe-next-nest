import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import type { Request } from 'express';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import type { SafeUser } from '../auth/auth.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;

  const mockService = {
    getPlans: jest.fn(),
    getUserSubscription: jest.fn(),
    createCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
    cancelSubscription: jest.fn(),
  };

  const mockReq = (user: SafeUser) =>
    ({ user }) as Request & { user: SafeUser };

  const fakeUser: SafeUser = {
    id: 'u1',
    email: 'a@b.com',
    name: 'Test',
    plan: Plan.FREE,
    avatarUrl: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [{ provide: SubscriptionService, useValue: mockService }],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPlans', () => {
    it('should return plans wrapped in object', () => {
      const plans = [{ key: Plan.FREE }, { key: Plan.STARTER }];
      mockService.getPlans.mockReturnValue(plans);

      const result = controller.getPlans();

      expect(result).toEqual({ plans });
    });
  });

  describe('getSubscription', () => {
    it('should return user subscription info', async () => {
      const subInfo = { plan: Plan.FREE, subscription: null };
      mockService.getUserSubscription.mockResolvedValue(subInfo);

      const result = await controller.getSubscription(mockReq(fakeUser));

      expect(result).toEqual(subInfo);
      expect(mockService.getUserSubscription).toHaveBeenCalledWith('u1');
    });
  });

  describe('createCheckout', () => {
    it('should return checkout URL', async () => {
      mockService.createCheckoutSession.mockResolvedValue(
        'https://checkout.stripe.com/session',
      );

      const result = await controller.createCheckout(mockReq(fakeUser), {
        priceId: 'price_123',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      });

      expect(result).toEqual({ url: 'https://checkout.stripe.com/session' });
      expect(mockService.createCheckoutSession).toHaveBeenCalledWith(
        'u1',
        'price_123',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel',
      );
    });
  });

  describe('createPortal', () => {
    it('should return portal URL', async () => {
      mockService.createBillingPortalSession.mockResolvedValue(
        'https://billing.stripe.com/portal',
      );

      const result = await controller.createPortal(mockReq(fakeUser), {
        returnUrl: 'http://localhost:3000/dashboard',
      });

      expect(result).toEqual({ url: 'https://billing.stripe.com/portal' });
      expect(mockService.createBillingPortalSession).toHaveBeenCalledWith(
        'u1',
        'http://localhost:3000/dashboard',
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and return ok', async () => {
      const result = await controller.cancelSubscription(mockReq(fakeUser), {});

      expect(result).toEqual({ ok: true });
      expect(mockService.cancelSubscription).toHaveBeenCalledWith('u1', false);
    });

    it('should pass immediate=true when provided', async () => {
      await controller.cancelSubscription(mockReq(fakeUser), {
        immediate: true,
      });

      expect(mockService.cancelSubscription).toHaveBeenCalledWith('u1', true);
    });
  });
});
