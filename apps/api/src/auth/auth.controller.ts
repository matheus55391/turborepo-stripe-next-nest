import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthService, type SafeUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const ACCESS_COOKIE = 'access_token';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  private setAuthCookie(res: Response, token: string) {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie(ACCESS_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: ONE_WEEK_MS,
      path: '/',
    });
  }

  private clearAuthCookie(res: Response) {
    const secure = process.env.NODE_ENV === 'production';
    res.clearCookie(ACCESS_COOKIE, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }

  @ApiOperation({ summary: 'Criar conta' })
  @ApiOkResponse({ description: 'Usuário criado e cookie definido' })
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const user = await this.auth.register(dto);
    const token = this.auth.signAccessToken(user);
    this.setAuthCookie(res, token);
    return user;
  }

  @ApiOperation({ summary: 'Entrar' })
  @ApiOkResponse({ description: 'Autenticado e cookie definido' })
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const user = await this.auth.validateUser(dto);
    const token = this.auth.signAccessToken(user);
    this.setAuthCookie(res, token);
    return user;
  }

  @ApiOperation({ summary: 'Sair' })
  @ApiOkResponse({ description: 'Cookie removido' })
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { ok: true as const };
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Usuário autenticado' })
  @ApiOkResponse({ description: 'Retorna o perfil do usuário logado' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: SafeUser }): SafeUser {
    return req.user;
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Upload de avatar do usuário' })
  @ApiOkResponse({ description: 'Avatar atualizado, retorna perfil' })
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch('avatar')
  async uploadAvatar(
    @Req() req: Request & { user: SafeUser },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<SafeUser> {
    const oldAvatarUrl = req.user.avatarUrl;

    const avatarUrl = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    if (oldAvatarUrl) {
      await this.storage.delete(oldAvatarUrl);
    }

    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatarUrl: user.avatarUrl,
    };
  }
}
