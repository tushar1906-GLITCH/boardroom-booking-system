import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FindRoomsQueryDto } from './dto/find-rooms.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Rooms')
@Controller('rooms')
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms with filters, pagination, and live status' })
  async findAll(@Query() query: FindRoomsQueryDto) {
    return this.roomsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get busy intervals and free slots for a room on a given date' })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-20' })
  async getAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ) {
    return this.roomsService.getAvailability(id, date);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new room (Admin only)' })
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing room (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a room with optional future booking cancellation (Admin only)' })
  @ApiQuery({ name: 'cancelFutureBookings', required: false, type: Boolean })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('cancelFutureBookings') cancelFutureBookings?: string,
    @CurrentUser('id') adminUserId?: string,
  ) {
    const shouldCancel = cancelFutureBookings === 'true';
    return this.roomsService.delete(id, shouldCancel, adminUserId || '');
  }
}
