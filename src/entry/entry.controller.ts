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
import { EntryService } from './entry.service';
import { JoinDto } from './dto/join.dto';
import { PositionQueryDto } from './dto/position-query.dto';
import { JoinResponse } from './interfaces/join-response.interface';
import { PositionResponse } from './interfaces/position-response.interface';

@Controller('waitlist')
export class EntryController {
  constructor(private readonly entryService: EntryService) {}

  @Post('join')
  async join(
    @Body() dto: JoinDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<JoinResponse> {
    const result = await this.entryService.join(dto, ip, userAgent);
    res.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);

    return result;
  }

  @Get('position')
  async getPosition(
    @Query() query: PositionQueryDto
  ): Promise<PositionResponse> {
    return this.entryService.getPosition(query.email);
  }
}
