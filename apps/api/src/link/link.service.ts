import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLAN_LIMITS } from '@repo/shared/types';
import { RevalidationService } from '../common/revalidation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  private async getPageForUser(pageId: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, slug: true, userId: true },
    });
    if (!page || page.userId !== userId) {
      throw new NotFoundException('Página não encontrada');
    }
    return page;
  }

  async create(pageId: string, userId: string, dto: CreateLinkDto) {
    const page = await this.getPageForUser(pageId, userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const linkCount = await this.prisma.link.count({ where: { pageId } });
    const limits = PLAN_LIMITS[user.plan];

    if (linkCount >= limits.maxLinksPerPage) {
      throw new ForbiddenException(
        `Seu plano permite no máximo ${limits.maxLinksPerPage} links por página`,
      );
    }

    const link = await this.prisma.link.create({
      data: {
        title: dto.title,
        url: dto.url,
        position: dto.position ?? linkCount,
        visible: dto.visible ?? true,
        pageId,
      },
    });

    this.revalidation.revalidatePage(page.slug);
    return link;
  }

  async findAllByPage(pageId: string, userId: string) {
    await this.getPageForUser(pageId, userId);
    return this.prisma.link.findMany({
      where: { pageId },
      orderBy: { position: 'asc' },
    });
  }

  async update(linkId: string, userId: string, dto: UpdateLinkDto) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
      include: { page: { select: { userId: true, slug: true } } },
    });
    if (!link || link.page.userId !== userId) {
      throw new NotFoundException('Link não encontrado');
    }

    const updated = await this.prisma.link.update({
      where: { id: linkId },
      data: dto,
    });

    this.revalidation.revalidatePage(link.page.slug);
    return updated;
  }

  async remove(linkId: string, userId: string) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
      include: { page: { select: { userId: true, slug: true } } },
    });
    if (!link || link.page.userId !== userId) {
      throw new NotFoundException('Link não encontrado');
    }

    await this.prisma.link.delete({ where: { id: linkId } });
    this.revalidation.revalidatePage(link.page.slug);
    return { ok: true as const };
  }

  /** Public — track a click */
  async trackClick(linkId: string) {
    const link = await this.prisma.link.findUnique({
      where: { id: linkId },
    });
    if (!link) throw new NotFoundException('Link não encontrado');

    await this.prisma.click.create({ data: { linkId } });
    return { ok: true as const };
  }
}
