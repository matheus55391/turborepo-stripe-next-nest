import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLAN_LIMITS } from '@repo/shared/types';
import { RevalidationService } from '../common/revalidation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async create(userId: string, dto: CreatePageDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { _count: { select: { pages: true } } },
    });

    const limits = PLAN_LIMITS[user.plan];
    if (user._count.pages >= limits.maxPages) {
      throw new ForbiddenException(
        `Seu plano permite no máximo ${limits.maxPages} página(s)`,
      );
    }

    const existing = await this.prisma.page.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Esse slug já está em uso');
    }

    return this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        bio: dto.bio ?? null,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.page.findMany({
      where: { userId },
      include: { _count: { select: { links: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(pageId: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: {
        links: { orderBy: { position: 'asc' } },
      },
    });
    if (!page || page.userId !== userId) {
      throw new NotFoundException('Página não encontrada');
    }
    return page;
  }

  async update(pageId: string, userId: string, dto: UpdatePageDto) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });
    if (!page || page.userId !== userId) {
      throw new NotFoundException('Página não encontrada');
    }

    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.page.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Esse slug já está em uso');
      }
    }

    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: dto,
    });

    // Revalidate ISR: old slug (if changed) and new slug
    if (dto.slug && dto.slug !== page.slug) {
      this.revalidation.revalidatePage(page.slug);
    }
    this.revalidation.revalidatePage(updated.slug);

    return updated;
  }

  async remove(pageId: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });
    if (!page || page.userId !== userId) {
      throw new NotFoundException('Página não encontrada');
    }

    await this.prisma.page.delete({ where: { id: pageId } });
    this.revalidation.revalidatePage(page.slug);
    return { ok: true as const };
  }

  /** Public — returns page by slug with visible links */
  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: {
        links: {
          where: { visible: true },
          orderBy: { position: 'asc' },
        },
        user: { select: { name: true } },
      },
    });
    if (!page || !page.published) {
      throw new NotFoundException('Página não encontrada');
    }
    return page;
  }
}
