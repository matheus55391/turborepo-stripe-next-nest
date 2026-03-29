import { ThrottlerStorageRedis } from './throttler-storage-redis';

describe('ThrottlerStorageRedis', () => {
  const mockClient = {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    set: jest.fn(),
  };

  const mockRedis = {
    client: mockClient,
    get: jest.fn(),
  };

  let storage: ThrottlerStorageRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new ThrottlerStorageRedis(mockRedis as any);
  });

  it('should increment counter and set TTL on first hit', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockClient.incr.mockResolvedValue(1);
    mockClient.ttl.mockResolvedValue(60);

    const result = await storage.increment(
      '127.0.0.1',
      60_000,
      10,
      0,
      'default',
    );

    expect(mockClient.incr).toHaveBeenCalledWith('throttle:default:127.0.0.1');
    expect(mockClient.expire).toHaveBeenCalledWith(
      'throttle:default:127.0.0.1',
      60,
    );
    expect(result.totalHits).toBe(1);
    expect(result.isBlocked).toBe(false);
  });

  it('should not set expire on subsequent hits', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockClient.incr.mockResolvedValue(5);
    mockClient.ttl.mockResolvedValue(30);

    await storage.increment('127.0.0.1', 60_000, 10, 0, 'default');

    expect(mockClient.expire).not.toHaveBeenCalled();
  });

  it('should block when limit is exceeded', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockClient.incr.mockResolvedValue(11);
    mockClient.ttl.mockResolvedValue(45);

    const result = await storage.increment(
      '127.0.0.1',
      60_000,
      10,
      120_000,
      'default',
    );

    expect(result.isBlocked).toBe(true);
    expect(result.totalHits).toBe(11);
    expect(mockClient.set).toHaveBeenCalledWith(
      'throttle:default:127.0.0.1:blocked',
      '1',
      'EX',
      120,
    );
  });

  it('should return blocked state if block key exists', async () => {
    mockRedis.get.mockResolvedValue(1);
    mockClient.ttl.mockResolvedValue(90);

    const result = await storage.increment(
      '127.0.0.1',
      60_000,
      10,
      120_000,
      'default',
    );

    expect(result.isBlocked).toBe(true);
    expect(result.totalHits).toBeGreaterThan(10);
    expect(mockClient.incr).not.toHaveBeenCalled();
  });
});
