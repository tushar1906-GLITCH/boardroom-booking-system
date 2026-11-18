import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Registers a new employee account.
   * Administrative accounts must be created through database seeding or role upgrades.
   */
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: UserRole.EMPLOYEE,
      department: dto.department?.trim() || null,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    const accessToken = await this.generateAccessToken(savedUser);
    const rawRefreshToken = await this.createAndSaveRefreshToken(savedUser.id);

    return {
      user: this.sanitizeUser(savedUser),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Authenticates user with email and password, returning tokens.
   */
  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact an administrator.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = await this.generateAccessToken(user);
    const rawRefreshToken = await this.createAndSaveRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Refreshes access token with full refresh token rotation.
   * Revokes the supplied refresh token and issues a fresh pair.
   */
  async refresh(rawToken: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    // Find all unrevoked and non-expired refresh tokens
    const activeTokens = await this.refreshTokenRepository.find({
      where: {
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    let matchedTokenRecord: RefreshToken | null = null;
    for (const record of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord || !matchedTokenRecord.user) {
      throw new UnauthorizedException('Refresh token is invalid or has expired.');
    }

    const user = matchedTokenRecord.user;
    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated.');
    }

    // Revoke the old token (Token Rotation guarantee)
    matchedTokenRecord.revokedAt = new Date();
    await this.refreshTokenRepository.save(matchedTokenRecord);

    // Issue a brand new pair
    const accessToken = await this.generateAccessToken(user);
    const newRawRefreshToken = await this.createAndSaveRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logs out user by revoking their active refresh token.
   */
  async logout(rawToken?: string) {
    if (!rawToken) {
      return { success: true };
    }

    const activeTokens = await this.refreshTokenRepository.find({
      where: {
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    for (const record of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
      if (isMatch) {
        record.revokedAt = new Date();
        await this.refreshTokenRepository.save(record);
        break;
      }
    }

    return { success: true };
  }

  /**
   * Returns current authenticated user profile.
   */
  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Updates profile information (full name, department).
   */
  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.department !== undefined) {
      user.department = dto.department.trim() || null;
    }

    const updated = await this.userRepository.save(user);
    return this.sanitizeUser(updated);
  }

  /**
   * Changes user password, verifying current password and revoking old refresh sessions.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    await this.userRepository.save(user);

    // Invalidate all active refresh tokens on password change
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { message: 'Password changed successfully. Please log in with your new password.' };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') || '15m',
    });
  }

  private async createAndSaveRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const tokenHash = await bcrypt.hash(rawToken, salt);

    // 7 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const entity = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    await this.refreshTokenRepository.save(entity);
    return rawToken;
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user as any;
    return rest;
  }
}
