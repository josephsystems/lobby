import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['/', '/api', '/api/v1'])
  getHelloMessage(): { message: string } {
    const message = this.appService.getHelloMessage();
    return {
      message,
    };
  }
}
