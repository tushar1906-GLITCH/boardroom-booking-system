import { IsOptional, IsString, IsUUID, IsEnum, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { BookingStatus } from '../entities/booking.entity';

export enum BookingScope {
  UPCOMING = 'upcoming',
  PAST = 'past',
  CANCELLED = 'cancelled',
  ALL = 'all',
}

export class FindBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingScope, default: BookingScope.ALL })
  @IsOptional()
  @IsEnum(BookingScope)
  scope?: BookingScope;

  @ApiPropertyOptional({ description: 'Filter by title or description text' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific Room ID' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Filter by User ID (Admin)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter by start time from' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter by start time to' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
