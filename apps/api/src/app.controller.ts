import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
@Public()
export class AppController {
  @Get()
  healthCheck() {
    return { status: 'ok', service: 'legalai-api' };
  }
}

/**
 * Health check controller mounted at /health.
 * Railway/Render healthchecks typically hit a specific path.
 * This is registered in AppModule with global prefix + version.
 */
@Controller('health')
@Public()
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'legalai-api', timestamp: new Date().toISOString() };
  }
}
