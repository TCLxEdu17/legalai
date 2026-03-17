import { Controller, Get, Head } from '@nestjs/common';

@Controller()
export class AppController {
  @Head()
  @Get()
  healthCheck() {
    return { status: 'ok', service: 'legalai-api' };
  }
}
