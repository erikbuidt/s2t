import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { TranscribeModule } from './transcribe/transcribe.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TranscribeModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
