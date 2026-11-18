import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API and PostgreSQL database health' })
  async check(@Res() res: Response) {
    try {
      await this.dataSource.query('SELECT 1');
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
