import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ example: 'Meu GitHub' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'https://github.com/user' })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
