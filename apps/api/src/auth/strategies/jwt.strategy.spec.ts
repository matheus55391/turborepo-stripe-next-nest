import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
  };

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      throw new Error(`Missing ${key}`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return user data when user exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Test',
      plan: Plan.FREE,
    });

    const result = await strategy.validate({ sub: 'user-1', email: 'a@b.com' });

    expect(result).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Test',
      plan: Plan.FREE,
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'nonexistent', email: 'x@y.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should look up user by payload.sub', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: null,
      plan: Plan.STARTER,
    });

    await strategy.validate({ sub: 'user-1', email: 'a@b.com' });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });
});
