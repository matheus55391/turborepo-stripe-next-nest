import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Plan } from '@prisma/client';
import { PageService } from './page.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PageService', () => {
  let service: PageService;

  const mockPrisma = {
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PageService>(PageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a page successfully', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.FREE,
        _count: { pages: 0 },
      });
      mockPrisma.page.findUnique.mockResolvedValue(null);
      const created = {
        id: 'p1',
        slug: 'my-page',
        title: 'My Page',
        bio: null,
        userId: 'u1',
      };
      mockPrisma.page.create.mockResolvedValue(created);

      const result = await service.create('u1', {
        slug: 'my-page',
        title: 'My Page',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: { slug: 'my-page', title: 'My Page', bio: null, userId: 'u1' },
      });
    });

    it('should throw ForbiddenException when page limit is reached (FREE)', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.FREE,
        _count: { pages: 1 },
      });

      await expect(
        service.create('u1', { slug: 'new', title: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        plan: Plan.FREE,
        _count: { pages: 0 },
      });
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('u1', { slug: 'taken', title: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByUser', () => {
    it('should return all pages for a user', async () => {
      const pages = [{ id: 'p1', slug: 'a', _count: { links: 2 } }];
      mockPrisma.page.findMany.mockResolvedValue(pages);

      const result = await service.findAllByUser('u1');

      expect(result).toEqual(pages);
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { _count: { select: { links: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return page with links', async () => {
      const page = {
        id: 'p1',
        userId: 'u1',
        links: [{ id: 'l1' }],
      };
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.findOne('p1', 'u1');

      expect(result).toEqual(page);
    });

    it('should throw NotFoundException if page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.findOne('p1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if page belongs to another user', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'other-user',
      });

      await expect(service.findOne('p1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the page', async () => {
      mockPrisma.page.findUnique
        .mockResolvedValueOnce({ id: 'p1', slug: 'old', userId: 'u1' })
        .mockResolvedValueOnce(null); // slug check
      const updated = { id: 'p1', slug: 'new-slug', title: 'Updated' };
      mockPrisma.page.update.mockResolvedValue(updated);

      const result = await service.update('p1', 'u1', {
        slug: 'new-slug',
        title: 'Updated',
      });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.update('p1', 'u1', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new slug is taken', async () => {
      mockPrisma.page.findUnique
        .mockResolvedValueOnce({ id: 'p1', slug: 'old', userId: 'u1' })
        .mockResolvedValueOnce({ id: 'p2' }); // slug taken

      await expect(
        service.update('p1', 'u1', { slug: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should skip slug check when slug is unchanged', async () => {
      mockPrisma.page.findUnique.mockResolvedValueOnce({
        id: 'p1',
        slug: 'same',
        userId: 'u1',
      });
      mockPrisma.page.update.mockResolvedValue({ id: 'p1', slug: 'same' });

      await service.update('p1', 'u1', { slug: 'same' });

      // findUnique called once for page, not for slug check
      expect(mockPrisma.page.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete the page and return ok', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
      });

      const result = await service.remove('p1', 'u1');

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('should throw NotFoundException if page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.remove('p1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return published page with visible links', async () => {
      const page = {
        id: 'p1',
        slug: 'my-page',
        published: true,
        links: [{ id: 'l1', visible: true }],
        user: { name: 'Test' },
      };
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.findBySlug('my-page');

      expect(result).toEqual(page);
    });

    it('should throw NotFoundException if page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if page is not published', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        published: false,
      });

      await expect(service.findBySlug('draft')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
