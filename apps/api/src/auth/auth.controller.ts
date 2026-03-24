import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService, type SafeUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const ACCESS_COOKIE = 'access_token';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
}
