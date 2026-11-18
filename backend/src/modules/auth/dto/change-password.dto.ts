import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword@123' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecurePassword@123',
    description: 'Password (min 8 chars, at least 1 letter and 1 number)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must be at least 8 characters long and contain at least one letter and one number.',
  })
  newPassword!: string;
}
