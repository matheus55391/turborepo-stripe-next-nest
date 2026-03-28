import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('WebhookController', () => {
  let controller: WebhookController;

  const mockStripe = {
    webhooks: { constructEvent: jest.fn() },
    getWebhookSecret: jest.fn().mockReturnValue('whsec_test'),
  };

  const mockSubscription = {
    handleCheckoutCompleted: jest.fn(),
    handleSubscriptionUpdated: jest.fn(),
    handleSubscriptionDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: StripeService, useValue: mockStripe },
        { provide: SubscriptionService, useValue: mockSubscription },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should throw BadRequestException when signature is missing', async () => {
    await expect(
      controller.handleWebhook(Buffer.from('{}'), ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when signature is invalid', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid sig');
    });

    await expect(
      controller.handleWebhook(Buffer.from('{}'), 'sig_bad'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle checkout.session.completed', async () => {
    const session = { id: 'cs_1', mode: 'subscription' };
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const result = await controller.handleWebhook(
      Buffer.from('body'),
      'sig_valid',
    );

    expect(result).toEqual({ received: true });
    expect(mockSubscription.handleCheckoutCompleted).toHaveBeenCalledWith(
      session,
    );
  });

  it('should handle customer.subscription.updated', async () => {
    const sub = { id: 'sub_1' };
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    await controller.handleWebhook(Buffer.from('body'), 'sig_valid');

    expect(mockSubscription.handleSubscriptionUpdated).toHaveBeenCalledWith(
      sub,
    );
  });

  it('should handle customer.subscription.deleted', async () => {
    const sub = { id: 'sub_1' };
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
    });

    await controller.handleWebhook(Buffer.from('body'), 'sig_valid');

    expect(mockSubscription.handleSubscriptionDeleted).toHaveBeenCalledWith(
      sub,
    );
  });

  it('should return received true for unknown event types', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'some.unknown.event',
      data: { object: {} },
    });

    const result = await controller.handleWebhook(
      Buffer.from('body'),
      'sig_valid',
    );

    expect(result).toEqual({ received: true });
    expect(mockSubscription.handleCheckoutCompleted).not.toHaveBeenCalled();
    expect(mockSubscription.handleSubscriptionUpdated).not.toHaveBeenCalled();
    expect(mockSubscription.handleSubscriptionDeleted).not.toHaveBeenCalled();
  });
});
