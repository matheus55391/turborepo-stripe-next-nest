jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

import * as amqplib from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMQService } from './rabbitmq.service';
import { QUEUES, DLQ_SUFFIX } from './rabbitmq.constants';
import { MetricsService } from '../metrics/metrics.service';

describe('RabbitMQService', () => {
  let service: RabbitMQService;

  const mockChannel = {
    assertQueue: jest.fn(),
    sendToQueue: jest.fn().mockReturnValue(true),
    prefetch: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn(),
    publish: jest.fn(),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    on: jest.fn(),
    close: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('amqp://localhost:5672'),
  };

  const mockMetrics = {
    queueProcessedTotal: { inc: jest.fn() },
    queueFailedTotal: { inc: jest.fn() },
  };

  beforeEach(async () => {
    (amqplib.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect, set prefetch, and assert all queues with DLQs', () => {
      expect(amqplib.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      // Each queue asserts DLQ + main queue = 2 calls per queue
      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(
        Object.keys(QUEUES).length * 2,
      );

      for (const queue of Object.values(QUEUES)) {
        expect(mockChannel.assertQueue).toHaveBeenCalledWith(
          `${queue}${DLQ_SUFFIX}`,
          { durable: true },
        );
        expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, {
          durable: true,
          deadLetterExchange: '',
          deadLetterRoutingKey: `${queue}${DLQ_SUFFIX}`,
        });
      }
    });

    it('should register error and close handlers on connection', () => {
      expect(mockConnection.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockConnection.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
    });

    it('should handle connection failure gracefully', async () => {
      (amqplib.connect as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const module = await Test.createTestingModule({
        providers: [
          RabbitMQService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: MetricsService, useValue: mockMetrics },
        ],
      }).compile();

      const svc = module.get<RabbitMQService>(RabbitMQService);
      await expect(svc.onModuleInit()).resolves.not.toThrow();
      await svc.onModuleDestroy();
    });
  });

  describe('publish', () => {
    it('should send persistent JSON message to queue', () => {
      const result = service.publish('test-queue', { foo: 'bar' });

      expect(result).toBe(true);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'test-queue',
        Buffer.from(JSON.stringify({ foo: 'bar' })),
        { persistent: true },
      );
    });

    it('should return false when channel is not available', async () => {
      (amqplib.connect as jest.Mock).mockRejectedValue(new Error('fail'));

      const module = await Test.createTestingModule({
        providers: [
          RabbitMQService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: MetricsService, useValue: mockMetrics },
        ],
      }).compile();

      const svc = module.get<RabbitMQService>(RabbitMQService);
      await svc.onModuleInit();

      expect(svc.publish('test-queue', { foo: 'bar' })).toBe(false);
      await svc.onModuleDestroy();
    });
  });

  describe('consume', () => {
    it('should register consumer for queue', async () => {
      const handler = jest.fn();
      await service.consume('test-queue', handler);

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
      );
    });

    it('should not register consumer when channel is unavailable', async () => {
      (amqplib.connect as jest.Mock).mockRejectedValue(new Error('fail'));

      const module = await Test.createTestingModule({
        providers: [
          RabbitMQService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: MetricsService, useValue: mockMetrics },
        ],
      }).compile();

      const svc = module.get<RabbitMQService>(RabbitMQService);
      await svc.onModuleInit();

      await svc.consume('test-queue', jest.fn());
      expect(mockChannel.consume).not.toHaveBeenCalled();
      await svc.onModuleDestroy();
    });

    it('should ack message on successful processing', async () => {
      let registeredHandler: (msg: any) => void;
      mockChannel.consume.mockImplementation(
        (_queue: string, handler: (msg: any) => void) => {
          registeredHandler = handler;
        },
      );

      const handler = jest.fn().mockResolvedValue(undefined);
      await service.consume('test-queue', handler);

      const msg = {
        content: Buffer.from(JSON.stringify({ linkId: 'l1' })),
        properties: { headers: {} },
      };
      registeredHandler!(msg);
      await new Promise((r) => setImmediate(r));

      expect(handler).toHaveBeenCalledWith({ linkId: 'l1' });
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should retry message on processing error when retries < MAX_RETRIES', async () => {
      let registeredHandler: (msg: any) => void;
      mockChannel.consume.mockImplementation(
        (_queue: string, handler: (msg: any) => void) => {
          registeredHandler = handler;
        },
      );

      const handler = jest.fn().mockRejectedValue(new Error('fail'));
      await service.consume('test-queue', handler);

      const msg = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        properties: { headers: {} },
      };
      registeredHandler!(msg);
      await new Promise((r) => setImmediate(r));

      // Should republish with incremented retry count, not nack
      expect(mockChannel.publish).toHaveBeenCalledWith(
        '',
        'test-queue',
        msg.content,
        { persistent: true, headers: { 'x-retry-count': 1 } },
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should nack message to DLQ when max retries reached', async () => {
      let registeredHandler: (msg: any) => void;
      mockChannel.consume.mockImplementation(
        (_queue: string, handler: (msg: any) => void) => {
          registeredHandler = handler;
        },
      );

      const handler = jest.fn().mockRejectedValue(new Error('fail'));
      await service.consume('test-queue', handler);

      const msg = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        properties: { headers: { 'x-retry-count': 3 } },
      };
      registeredHandler!(msg);
      await new Promise((r) => setImmediate(r));

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should skip null messages', async () => {
      let registeredHandler: (msg: any) => void;
      mockChannel.consume.mockImplementation(
        (_queue: string, handler: (msg: any) => void) => {
          registeredHandler = handler;
        },
      );

      const handler = jest.fn();
      await service.consume('test-queue', handler);

      registeredHandler!(null);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close channel and connection', async () => {
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
