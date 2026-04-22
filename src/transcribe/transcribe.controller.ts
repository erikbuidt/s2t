import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TranscribeDto } from './dto/transcribe.dto';
import { TranscribeService } from './transcribe.service';

@Controller('transcribe')
export class TranscribeController {
  constructor(private readonly transcribeService: TranscribeService) {}

  /**
   * POST /transcribe
   *
   * Body:
   *   { "url": "https://www.facebook.com/watch?v=...", "mode": "transcript" }
   *
   * Response:
   *   { "mode": "transcript", "result": "Full transcript text..." }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async transcribe(@Body() dto: TranscribeDto) {
    return this.transcribeService.transcribe(dto);
  }
}
