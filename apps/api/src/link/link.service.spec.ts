import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import { LinkService } from './link.service';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidationService } from '../common/revalidation.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { QUEUES } from '../rabbitmq/rabbitmq.constants';

describe('LinkService', () => {
  let service: LinkService;

  const mockPrisma = {
    page: { findUnique: jest.fn() },
    user: { findUniqueOrThrow: jest.fn() },
    link: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    click: { create: jest.fn() },
  };

  const mockRevalidation = {
    revalidatePage: jest.fn(),
  };

  const mockRabbitMQ = {
    publish: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RevalidationService, useValue: mockRevalidation },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
      ],
    }).compile();

    service = module.get<LinkService>(LinkService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── helpers ────────────────────────────────────────────
  const stubPageForUser = () =>
    mockPrisma.page.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'my-page',
      userId: 'u1',
    });

  describe('create', () => {
    it('should create a link successfully', async () => {
      stubPageForUser();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.FREE,
      });
      mockPrisma.link.count.mockResolvedValue(0);
      const created = { id: 'l1', title: 'GH', url: 'https://github.com' };
      mockPrisma.link.create.mockResolvedValue(created);

      const result = await service.create('p1', 'u1', {
        title: 'GH',
        url: 'https://github.com',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.link.create).toHaveBeenCalledWith({
        data: {
          title: 'GH',
          url: 'https://github.com',
          position: 0,
          visible: true,
          pageId: 'p1',
        },
      });
    });

    it('should throw ForbiddenException when link limit reached (FREE)', async () => {
      stubPageForUser();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.FREE,
      });
      mockPrisma.link.count.mockResolvedValue(3); // FREE limit = 3

      await expect(
        service.create('p1', 'u1', {
          title: 'X',
          url: 'https://x.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when page does not belong to user', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'other-user',
      });

      await expect(
        service.create('p1', 'u1', {
          title: 'X',
          url: 'https://x.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.create('p1', 'u1', {
          title: 'X',
          url: 'https://x.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use provided position and visible values', async () => {
      stubPageForUser();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.STARTER,
      });
      mockPrisma.link.count.mockResolvedValue(0);
      mockPrisma.link.create.mockResolvedValue({ id: 'l1' });

      await service.create('p1', 'u1', {
        title: 'X',
        url: 'https://x.com',
        position: 5,
        visible: false,
      });

      expect(mockPrisma.link.create).toHaveBeenCalledWith({
        data: {
          title: 'X',
          url: 'https://x.com',
          position: 5,
          visible: false,
          pageId: 'p1',
        },
      });
    });
  });

  describe('findAllByPage', () => {
    it('should return links ordered by position', async () => {
      stubPageForUser();
      const links = [
        { id: 'l1', position: 0 },
        { id: 'l2', position: 1 },
      ];
      mockPrisma.link.findMany.mockResolvedValue(links);

      const result = await service.findAllByPage('p1', 'u1');

      expect(result).toEqual(links);
      expect(mockPrisma.link.findMany).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
        orderBy: { position: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update the link', async () => {
      mockPrisma.link.findUnique.mockResolvedValue({
        id: 'l1',
        page: { userId: 'u1', slug: 'my-page' },
      });
      const updated = { id: 'l1', title: 'Updated' };
      mockPrisma.link.update.mockResolvedValue(updated);

      const result = await service.update('l1', 'u1', { title: 'Updated' });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if link not found', async () => {
      mockPrisma.link.findUnique.mockResolvedValue(null);

      await expect(service.update('l1', 'u1', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if link belongs to another user', async () => {
      mockPrisma.link.findUnique.mockResolvedValue({
        id: 'l1',
        page: { userId: 'other', slug: 'x' },
      });

      await expect(service.update('l1', 'u1', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete the link and return ok', async () => {
      mockPrisma.link.findUnique.mockResolvedValue({
        id: 'l1',
        page: { userId: 'u1', slug: 'my-page' },
      });

      const result = await service.remove('l1', 'u1');

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.link.delete).toHaveBeenCalledWith({
        where: { id: 'l1' },
      });
    });

    it('should throw NotFoundException if link not found', async () => {
      mockPrisma.link.findUnique.mockResolvedValue(null);

      await expect(service.remove('l1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('trackClick', () => {
    it('should publish click event to RabbitMQ and return ok', async () => {
      mockPrisma.link.findUnique.mockResolvedValue({ id: 'l1' });

      const result = await service.trackClick('l1');

      expect(result).toEqual({ ok: true });
      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        QUEUES.CLICK_TRACKING,
        { linkId: 'l1' },
      );
    });

    it('should throw NotFoundException if link not found', async () => {
      mockPrisma.link.findUnique.mockResolvedValue(null);

      await expect(service.trackClick('l1')).rejects.toThrow(NotFoundException);
    });
  });
});
