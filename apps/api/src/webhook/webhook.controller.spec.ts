import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { StripeService } from '../stripe/stripe.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { QUEUES } from '../rabbitmq/rabbitmq.constants';

describe('WebhookController', () => {
  let controller: WebhookController;

  const mockStripe = {
    webhooks: { constructEvent: jest.fn() },
    getWebhookSecret: jest.fn().mockReturnValue('whsec_test'),
  };

  const mockRabbitMQ = {
    publish: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: StripeService, useValue: mockStripe },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
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

  it('should publish checkout.session.completed to RabbitMQ', async () => {
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
    expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
      QUEUES.WEBHOOK_PROCESSING,
      { type: 'checkout.session.completed', data: session },
    );
  });

  it('should publish customer.subscription.updated to RabbitMQ', async () => {
    const sub = { id: 'sub_1' };
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    await controller.handleWebhook(Buffer.from('body'), 'sig_valid');

    expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
      QUEUES.WEBHOOK_PROCESSING,
      { type: 'customer.subscription.updated', data: sub },
    );
  });

  it('should publish customer.subscription.deleted to RabbitMQ', async () => {
    const sub = { id: 'sub_1' };
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
    });

    await controller.handleWebhook(Buffer.from('body'), 'sig_valid');

    expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
      QUEUES.WEBHOOK_PROCESSING,
      { type: 'customer.subscription.deleted', data: sub },
    );
  });

  it('should publish unknown event types to RabbitMQ', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'some.unknown.event',
      data: { object: {} },
    });

    const result = await controller.handleWebhook(
      Buffer.from('body'),
      'sig_valid',
    );

    expect(result).toEqual({ received: true });
    expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
      QUEUES.WEBHOOK_PROCESSING,
      { type: 'some.unknown.event', data: {} },
    );
  });
});
