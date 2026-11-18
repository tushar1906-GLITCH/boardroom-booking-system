import { IsISO8601, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleBookingDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Optional new Room UUID' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({ example: '2026-11-20T11:00:00.000Z', description: 'New ISO start timestamp' })
  @IsISO8601()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-11-20T12:00:00.000Z', description: 'New ISO end timestamp' })
  @IsISO8601()
  @IsNotEmpty()
  endTime!: string;
}
