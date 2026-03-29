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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageService } from './page.service';

@ApiTags('pages')
@Controller('pages')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  /** Public — acessar página por slug */
  @ApiOperation({ summary: 'Acessar página pública pelo slug' })
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.pageService.findBySlug(slug);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar páginas do usuário' })
  @Get()
  findAll(@Req() req: Request & { user: SafeUser }) {
    return this.pageService.findAllByUser(req.user.id);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar nova página' })
  @Post()
  create(@Req() req: Request & { user: SafeUser }, @Body() dto: CreatePageDto) {
    return this.pageService.create(req.user.id, dto);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalhes da página com links' })
  @Get(':id')
  findOne(@Req() req: Request & { user: SafeUser }, @Param('id') id: string) {
    return this.pageService.findOne(id, req.user.id);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar página' })
  @Patch(':id')
  update(
    @Req() req: Request & { user: SafeUser },
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pageService.update(id, req.user.id, dto);
  }

  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir página' })
  @Delete(':id')
  remove(@Req() req: Request & { user: SafeUser }, @Param('id') id: string) {
    return this.pageService.remove(id, req.user.id);
  }
}
