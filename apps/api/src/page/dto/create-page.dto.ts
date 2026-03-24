import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'meu-perfil', description: 'Slug único da página (URL)' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug!: string;

  @ApiProperty({ example: 'Meu Perfil' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;

  @ApiPropertyOptional({ example: 'Dev & criador de conteúdo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;
}
