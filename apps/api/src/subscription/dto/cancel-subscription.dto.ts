import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description:
      'Se true, cancela imediatamente. Se false, cancela no fim do período.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
