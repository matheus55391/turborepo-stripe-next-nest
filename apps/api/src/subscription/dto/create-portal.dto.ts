import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class CreatePortalDto {
  @ApiProperty({
    description: 'URL to redirect back after portal session',
    example: 'http://localhost:3000/dashboard',
  })
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}
