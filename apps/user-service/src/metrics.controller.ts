import { Controller, Get, Res } from '@nestjs/common';
import { register } from 'prom-client';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class MetricsController {
  @Public()
  @Get('metrics')
  async getMetrics(@Res() res) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
