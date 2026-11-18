import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Client meeting postponed to next month.', description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
