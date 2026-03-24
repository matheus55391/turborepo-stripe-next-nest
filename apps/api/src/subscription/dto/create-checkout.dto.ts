import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Stripe Price ID for the plan',
    example: 'price_xxx',
  })
  @IsString()
  priceId!: string;

  @ApiProperty({
    description: 'URL to redirect after successful checkout',
    example: 'http://localhost:3000/dashboard?checkout=success',
  })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({
    description: 'URL to redirect if checkout is cancelled',
    example: 'http://localhost:3000/dashboard?checkout=cancel',
  })
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
