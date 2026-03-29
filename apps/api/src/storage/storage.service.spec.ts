import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest
      .fn()
      .mockImplementation((args: Record<string, unknown>) => ({
        ...args,
        _type: 'PutObject',
      })),
    DeleteObjectCommand: jest
      .fn()
      .mockImplementation((args: Record<string, unknown>) => ({
        ...args,
        _type: 'DeleteObject',
      })),
    CreateBucketCommand: jest
      .fn()
      .mockImplementation((args: Record<string, unknown>) => ({
        ...args,
        _type: 'CreateBucket',
      })),
    HeadBucketCommand: jest
      .fn()
      .mockImplementation((args: Record<string, unknown>) => ({
        ...args,
        _type: 'HeadBucket',
      })),
    PutBucketPolicyCommand: jest
      .fn()
      .mockImplementation((args: Record<string, unknown>) => ({
        ...args,
        _type: 'PutBucketPolicy',
      })),
  };
});

jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid',
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockConfig = {
    get: jest.fn((key: string, fallback: string) => fallback),
  };

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      mockSend.mockRejectedValueOnce(new Error('NotFound'));
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should skip creation if bucket exists', async () => {
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('upload', () => {
    it('should upload file and return public URL', async () => {
      mockSend.mockResolvedValue({});

      const url = await service.upload(
        Buffer.from('img'),
        'photo.jpg',
        'image/jpeg',
      );

      expect(url).toBe('http://localhost:9000/avatars/test-uuid.jpg');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'avatars',
          Key: 'test-uuid.jpg',
          ContentType: 'image/jpeg',
        }),
      );
    });

    it('should default to .jpg when no extension', async () => {
      mockSend.mockResolvedValue({});

      const url = await service.upload(
        Buffer.from('img'),
        'photo',
        'image/jpeg',
      );

      expect(url).toBe('http://localhost:9000/avatars/test-uuid.jpg');
    });
  });

  describe('delete', () => {
    it('should delete object by extracting key from URL', async () => {
      mockSend.mockResolvedValue({});

      await service.delete('http://localhost:9000/avatars/some-uuid.jpg');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'avatars',
          Key: 'some-uuid.jpg',
        }),
      );
    });

    it('should not throw on failure', async () => {
      mockSend.mockRejectedValue(new Error('network'));

      await expect(
        service.delete('http://localhost:9000/avatars/some-uuid.jpg'),
      ).resolves.toBeUndefined();
    });
  });
});
