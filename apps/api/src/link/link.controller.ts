import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinkService } from './link.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('links')
@Controller('pages/:pageId/links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  /** Public — registrar clique */
  @ApiOperation({ summary: 'Registrar clique em um link' })
  @Throttle({ click: { ttl: 10_000, limit: 10 } })
  @Post(':linkId/click')
  trackClick(@Param('linkId') linkId: string) {
    return this.linkService.trackClick(linkId);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar links da página' })
  @Get()
  findAll(
    @Req() req: Request & { user: SafeUser },
    @Param('pageId') pageId: string,
  ) {
    return this.linkService.findAllByPage(pageId, req.user.id);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar link na página' })
  @Post()
  create(
    @Req() req: Request & { user: SafeUser },
    @Param('pageId') pageId: string,
    @Body() dto: CreateLinkDto,
  ) {
    return this.linkService.create(pageId, req.user.id, dto);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar link' })
  @Patch(':linkId')
  update(
    @Req() req: Request & { user: SafeUser },
    @Param('linkId') linkId: string,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.linkService.update(linkId, req.user.id, dto);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir link' })
  @Delete(':linkId')
  remove(
    @Req() req: Request & { user: SafeUser },
    @Param('linkId') linkId: string,
  ) {
    return this.linkService.remove(linkId, req.user.id);
  }
}
