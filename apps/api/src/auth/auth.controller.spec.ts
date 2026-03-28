import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService, type SafeUser } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    validateUser: jest.fn(),
    signAccessToken: jest.fn(),
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
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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
      };
      const req = { user } as Request & { user: SafeUser };

      const result = controller.me(req);

      expect(result).toEqual(user);
    });
  });
});
