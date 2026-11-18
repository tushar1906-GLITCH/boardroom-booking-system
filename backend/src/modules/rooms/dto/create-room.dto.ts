import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../entities/room.entity';

export class CreateRoomDto {
  @ApiProperty({ example: 'Ada Lovelace Focus Room' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '1st Floor, East Wing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  floorOrLocation!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity!: number;

  @ApiPropertyOptional({ example: 'Dedicated meeting space with acoustic treatment.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['Whiteboard', 'TV Screen', 'Video Conferencing'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ example: '#7C6CFF' })
  @IsOptional()
  @IsString()
  accentColor?: string;
}
