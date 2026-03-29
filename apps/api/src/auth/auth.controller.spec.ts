import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService, type SafeUser } from './auth.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { QUEUES } from '../rabbitmq/rabbitmq.constants';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
    signAccessToken: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  const mockRabbitMQ = {
    publish: jest.fn().mockReturnValue(true),
  };

  const createMockResponse = () => {
    const res = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register user, set cookie, and return safe user', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
      };
      mockAuthService.register.mockResolvedValue(user);
      mockAuthService.signAccessToken.mockReturnValue('jwt-token');
      const res = createMockResponse();

      const result = await controller.register(
        { email: 'a@b.com', password: '12345678', name: 'Test' },
        res as never,
      );

      expect(result).toEqual(user);
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: '12345678',
        name: 'Test',
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });
  });

  describe('login', () => {
    it('should validate user, set cookie, and return safe user', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        name: null,
        plan: Plan.FREE,
        avatarUrl: null,
      };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.signAccessToken.mockReturnValue('jwt-token');
      const res = createMockResponse();

      const result = await controller.login(
        { email: 'a@b.com', password: '12345678' },
        res as never,
      );

      expect(result).toEqual(user);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('logout', () => {
    it('should clear cookie and return ok', () => {
      const res = createMockResponse();

      const result = controller.logout(res as never);

      expect(result).toEqual({ ok: true });
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('me', () => {
    it('should return the authenticated user from request', () => {
      const user: SafeUser = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
      };
      const req = { user } as Request & { user: SafeUser };

      const result = controller.me(req);

      expect(result).toEqual(user);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload file, update user, and return safe user', async () => {
      const reqUser: SafeUser = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
      };
      const req = { user: reqUser } as Request & { user: SafeUser };
      const file = {
        buffer: Buffer.from('img'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockStorageService.upload.mockResolvedValue('http://localhost:9000/avatars/uuid.jpg');
      mockPrismaService.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: 'http://localhost:9000/avatars/uuid.jpg',
      });

      const result = await controller.uploadAvatar(req, file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        file.buffer,
        'photo.jpg',
        'image/jpeg',
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: 'http://localhost:9000/avatars/uuid.jpg' },
      });
      expect(result.avatarUrl).toBe('http://localhost:9000/avatars/uuid.jpg');
    });

    it('should enqueue old avatar deletion via RabbitMQ', async () => {
      const reqUser: SafeUser = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: 'http://localhost:9000/avatars/old.jpg',
      };
      const req = { user: reqUser } as Request & { user: SafeUser };
      const file = {
        buffer: Buffer.from('img'),
        originalname: 'new.png',
        mimetype: 'image/png',
      } as Express.Multer.File;

      mockStorageService.upload.mockResolvedValue('http://localhost:9000/avatars/new-uuid.png');
      mockPrismaService.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: 'http://localhost:9000/avatars/new-uuid.png',
      });

      await controller.uploadAvatar(req, file);

      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        QUEUES.STORAGE_CLEANUP,
        { url: 'http://localhost:9000/avatars/old.jpg' },
      );
    });
  });
});
