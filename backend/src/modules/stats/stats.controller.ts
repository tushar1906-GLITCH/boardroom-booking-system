import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics & Statistics')
@Controller('stats')
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Employee personal dashboard metrics' })
  async getMeStats(@CurrentUser('id') userId: string) {
    return this.statsService.getMeStats(userId);
  }

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'High-level business KPIs and room utilization summary (Admin)' })
  async getOverview() {
    return this.statsService.getOverview();
  }

  @Get('bookings-per-day')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '30-day booking volume distribution (Admin)' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  async getBookingsPerDay(@Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.statsService.getBookingsPerDay(daysCount);
  }

  @Get('room-utilization')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Per-room utilization percentage and hours (Admin)' })
  async getRoomUtilization() {
    return this.statsService.getRoomUtilization();
  }

  @Get('peak-hours')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hour x Weekday heatmap of company meeting patterns (Admin)' })
  async getPeakHours() {
    return this.statsService.getPeakHours();
  }

  @Get('top-rooms')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Top 5 most booked rooms (Admin)' })
  async getTopRooms() {
    return this.statsService.getTopRooms();
  }
}
