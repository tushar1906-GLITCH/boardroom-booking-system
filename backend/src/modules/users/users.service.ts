import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto, buildPaginatedResponse } from '../../common/dto/pagination.dto';

export class FindUsersQueryDto extends PaginationQueryDto {
  search?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async findAll(query: FindUsersQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const qb = this.userRepository.createQueryBuilder('user');

    if (query.search) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search OR user.department ILIKE :search)', {
        search,
      });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC');
    qb.skip(skip).take(pageSize);

    const [users, total] = await qb.getManyAndCount();

    return buildPaginatedResponse(users, total, page, pageSize);
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, currentAdminId: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Critical Guard: An admin cannot demote or deactivate themselves
    if (id === currentAdminId) {
      if (dto.role !== undefined && dto.role !== UserRole.ADMIN) {
        throw new BadRequestException('Administrators cannot demote their own role.');
      }
      if (dto.isActive !== undefined && dto.isActive === false) {
        throw new BadRequestException('Administrators cannot deactivate their own account.');
      }
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;

      // If user is being deactivated, revoke all their active refresh tokens immediately
      if (dto.isActive === false) {
        await this.refreshTokenRepository.update(
          { userId: id, revokedAt: undefined },
          { revokedAt: new Date() },
        );
      }
    }

    return this.userRepository.save(user);
  }
}
