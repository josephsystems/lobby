import { Body, Controller, Ip, Headers, Post } from '@nestjs/common';
import { EntryService } from './entry.service';
import { JoinDto } from './dto/join.dto';
import { JoinResponse } from './interfaces/join-response.interface';

@Controller('waitlist')
export class EntryController {
  constructor(private readonly entryService: EntryService) {}

  @Post('join')
  async join(
    @Body() dto: JoinDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ): Promise<JoinResponse> {
    return this.entryService.join(dto, ip, userAgent);
  }
}
