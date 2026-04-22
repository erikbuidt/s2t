import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { TranscribeModule } from './transcribe/transcribe.module';

@Module({
  imports: [
    // Makes .env available globally via ConfigService
    ConfigModule.forRoot({ isGlobal: true }),
    TranscribeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
