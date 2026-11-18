import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the employee' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'john.doe@company.com', description: 'Corporate email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Password (min 8 chars, at least 1 letter and 1 number)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must be at least 8 characters long and contain at least one letter and one number.',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'Engineering', description: 'Department or team' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
