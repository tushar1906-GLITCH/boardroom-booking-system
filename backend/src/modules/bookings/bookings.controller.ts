import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { FindBookingsQueryDto } from './dto/find-bookings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meeting room booking' })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.create(dto, userId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List bookings created by the current authenticated employee' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: FindBookingsQueryDto,
  ) {
    return this.bookingsService.findMine(userId, query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get confirmed bookings within a date range formatted for FullCalendar' })
  @ApiQuery({ name: 'from', required: true, example: '2026-11-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to', required: true, example: '2026-11-30T23:59:59.000Z' })
  @ApiQuery({ name: 'roomIds', required: false, description: 'Comma separated room IDs' })
  async getCalendarEvents(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('roomIds') roomIds?: string,
  ) {
    return this.bookingsService.getCalendarEvents(from, to, roomIds);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all bookings across the enterprise (Admin only)' })
  async findAllAdmin(@Query() query: FindBookingsQueryDto) {
    return this.bookingsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID (Owner or Admin)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.bookingsService.findOne(id, userId, userRole);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a booking to a new time or room (Owner or Admin)' })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.bookingsService.reschedule(id, dto, userId, userRole);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking with optional reason (Owner or Admin)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.bookingsService.cancel(id, dto, userId, userRole);
  }
}
