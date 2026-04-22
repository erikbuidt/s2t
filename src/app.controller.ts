import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  root() {
    return { 
      title: 's2t | AI Facebook Video Transcriber',
      description: 'Generate high-quality transcripts and summaries from Facebook videos using OpenAI Whisper and GPT-4o-mini.'
    };
  }
}
