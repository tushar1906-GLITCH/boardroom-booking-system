import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { RoomStatus } from '../entities/room.entity';

export class FindRoomsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by room name, location, or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum room capacity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ description: 'Maximum room capacity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(500)
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Comma-separated list of amenities required (e.g. "Whiteboard,TV Screen")' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'ISO start timestamp to check availability' })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'ISO end timestamp to check availability' })
  @IsOptional()
  @IsISO8601()
  availableTo?: string;

  @ApiPropertyOptional({ description: 'Sort field: name, capacity, createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
}
