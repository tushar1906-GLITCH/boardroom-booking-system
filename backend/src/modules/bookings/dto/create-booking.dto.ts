import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Room UUID' })
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ example: 'Q4 Product Roadmap Sync', description: 'Title of the meeting' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: 'Strategic planning for upcoming quarterly features.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 4, minimum: 1, description: 'Number of expected attendees' })
  @IsInt()
  @Min(1)
  attendeeCount!: number;

  @ApiProperty({ example: '2026-11-20T10:00:00.000Z', description: 'ISO 8601 start time' })
  @IsISO8601()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-11-20T11:00:00.000Z', description: 'ISO 8601 end time' })
  @IsISO8601()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Minutes before meeting to send reminder (0, 10, 15, 30, 60)',
    enum: [0, 10, 15, 30, 60],
  })
  @IsOptional()
  @IsInt()
  @IsIn([0, 10, 15, 30, 60])
  reminderMinutesBefore?: number;
}
