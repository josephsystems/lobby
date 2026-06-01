import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Ip,
  Headers,
  Query,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { WaitlistService } from './waitlist.service';
import { WaitlistJoinDto } from './dto/waitlist-join.dto';
import { WaitlistPositionQueryDto } from './dto/waitlist-position-query.dto';
import { WaitlistJoinResponse } from './interfaces/waitlist-join-response.interface';
import { WaitlistPositionResponse } from './interfaces/waitlist-position-response.interface';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  async join(
    @Body() dto: WaitlistJoinDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<WaitlistJoinResponse> {
    const result = await this.waitlistService.join(dto, ip, userAgent);
    res.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);

    return result;
  }

  @Get('position')
  async getPosition(
    @Query() query: WaitlistPositionQueryDto
  ): Promise<WaitlistPositionResponse> {
    return this.waitlistService.getPosition(query.email);
  }
}
