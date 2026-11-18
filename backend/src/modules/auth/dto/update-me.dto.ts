import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Johnathan Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: 'Architecture & DevOps' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
