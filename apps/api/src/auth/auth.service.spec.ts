import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn(),
  };

  const mockMetrics = {
    authAttemptsTotal: { inc: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should create a new user and return safe user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

      const created = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
        password: 'hashed-pw',
      };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.register({
        email: 'a@b.com',
        password: '12345678',
        name: 'Test',
      });

      expect(result).toEqual({
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@b.com', password: 'hashed-pw', name: 'Test' },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'a@b.com', password: '12345678' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should set name to null when not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: null,
        plan: Plan.FREE,
        avatarUrl: null,
        password: 'hashed-pw',
      });

      await service.register({ email: 'a@b.com', password: '12345678' });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@b.com', password: 'hashed-pw', name: null },
      });
    });
  });

  describe('validateUser', () => {
    it('should return safe user when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
        password: 'hashed-pw',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({
        email: 'a@b.com',
        password: '12345678',
      });

      expect(result).toEqual({
        id: 'u1',
        email: 'a@b.com',
        name: 'Test',
        plan: Plan.FREE,
        avatarUrl: null,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser({ email: 'x@y.com', password: '12345678' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: 'hashed-pw',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signAccessToken', () => {
    it('should call jwt.sign with sub and email', () => {
      mockJwt.sign.mockReturnValue('token-123');

      const result = service.signAccessToken({
        id: 'u1',
        email: 'a@b.com',
        name: null,
        plan: Plan.FREE,
        avatarUrl: null,
      });

      expect(result).toBe('token-123');
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'a@b.com',
      });
    });
  });
});
