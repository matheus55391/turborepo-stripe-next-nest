import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

const apiEnvDir = join(__dirname, '..');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Paths relative to this package (not process.cwd()). `.env` wins over `.env.example` for duplicate keys.
      envFilePath: [join(apiEnvDir, '.env'), join(apiEnvDir, '.env.example')],
    }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
