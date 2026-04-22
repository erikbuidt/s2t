import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { TranscribeDto, TranscribeMode } from './dto/transcribe.dto';

const execFileAsync = promisify(execFile);

@Injectable()
export class TranscribeService implements OnModuleInit {
  private readonly logger = new Logger(TranscribeService.name);
  private openai: OpenAI;
  private ytDlpBin: string;

  constructor(private readonly config: ConfigService) { }

  onModuleInit() {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment');
    }
    // Set a generous timeout (10 minutes) for Whisper transcription
    this.openai = new OpenAI({
      apiKey,
      timeout: 10 * 60 * 1000,
    });
    this.ytDlpBin = this.resolveYtDlp();
    this.logger.log(`yt-dlp binary: ${this.ytDlpBin}`);
  }

  // ─── Public method ──────────────────────────────────────────────────────────

  async transcribe(dto: TranscribeDto): Promise<{ mode: TranscribeMode; result: string }> {
    const mode = dto.mode ?? 'transcript';
    let audioPath: string | null = null;

    try {
      audioPath = await this.downloadAudio(dto.url);
      const transcript = await this.transcribeWithWhisper(audioPath);

      let result: string;
      if (mode === 'transcript') {
        result = transcript;
      } else {
        result = await this.summarizeWithGPT(transcript, mode);
      }

      return { mode, result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : '';
      this.logger.error(`Transcription failed: ${message}`, stack);
      throw new InternalServerErrorException(message);
    } finally {
      if (audioPath) this.cleanupTempDir(audioPath);
    }
  }

  // ─── yt-dlp binary resolution ────────────────────────────────────────────────

  private resolveYtDlp(): string {
    // Common macOS pip install paths
    const candidates = [
      path.join(__dirname, '..', '..', 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp'),
      `/Users/${os.userInfo().username}/Library/Python/3.9/bin/yt-dlp`,
      `/Users/${os.userInfo().username}/Library/Python/3.10/bin/yt-dlp`,
      `/Users/${os.userInfo().username}/Library/Python/3.11/bin/yt-dlp`,
      `/Users/${os.userInfo().username}/Library/Python/3.12/bin/yt-dlp`,
      '/usr/local/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }

    // Final fallback — rely on PATH
    return 'yt-dlp';
  }

  // ─── Step 1: Download audio ──────────────────────────────────────────────────

  private sanitizeUrl(url: string): string {
    return url.replace(/\\([?=&#])/g, '$1').trim();
  }

  private async downloadAudio(rawUrl: string): Promise<string> {
    const url = this.sanitizeUrl(rawUrl);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2t-'));
    const outputTemplate = path.join(tmpDir, 'audio.%(ext)s');

    this.logger.log(`Downloading audio: ${url}`);

    const args = [
      url,
      '--format', 'bestaudio',
      '--output', outputTemplate,
      '--no-playlist',
      '--add-header',
      'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--quiet',
    ];

    try {
      await execFileAsync(this.ytDlpBin, args, {
        maxBuffer: 50 * 1024 * 1024,
      });
    } catch (err: unknown) {
      const error = err as { stderr?: string; message?: string };
      throw new Error(`yt-dlp download failed: ${error.stderr ?? error.message}`);
    }

    const files = fs.readdirSync(tmpDir);
    const audioFile = files.find((f) => f.startsWith('audio.'));
    if (!audioFile) {
      throw new Error('yt-dlp ran but produced no audio file');
    }

    const audioPath = path.join(tmpDir, audioFile);
    const sizeMB = fs.statSync(audioPath).size / 1024 / 1024;

    if (sizeMB > 25) {
      throw new Error(
        `Audio file is ${sizeMB.toFixed(1)} MB — exceeds Whisper's 25 MB limit. ` +
        'Try a shorter video, or install ffmpeg to compress the audio.',
      );
    }

    this.logger.log(`Audio downloaded: ${audioFile} (${sizeMB.toFixed(2)} MB)`);
    return audioPath;
  }

  // ─── Step 2: Whisper transcription ───────────────────────────────────────────

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    this.logger.log('Sending to Whisper for transcription...');

    const transcription = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'text',
    });
    this.logger.log('Transcription complete');
    // The SDK types response_format 'text' as a string
    return transcription as unknown as string;
  }

  // ─── Step 3: GPT-4o-mini summarization ───────────────────────────────────────

  private async summarizeWithGPT(
    transcript: string,
    mode: 'summary' | 'both',
  ): Promise<string> {
    this.logger.log(`Summarizing with GPT-4o-mini (mode: ${mode})...`);

    const includeTranscript = mode === 'both';

    const userPrompt = includeTranscript
      ? `Here is a transcript:\n\n${transcript}\n\n` +
      'Please provide:\n' +
      '1. **Full Transcript** (lightly cleaned for readability)\n' +
      '2. **Summary**: A concise 2–4 sentence summary.\n' +
      '3. **Key Points**: A bullet list of the main points.'
      : `Here is a transcript:\n\n${transcript}\n\n` +
      'Please provide:\n' +
      '1. **Summary**: A concise 2–4 sentence summary.\n' +
      '2. **Key Points**: A bullet list of the main points.';

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at summarizing audio transcripts clearly and concisely.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content ?? '(no response)';
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  private cleanupTempDir(audioPath: string): void {
    try {
      fs.rmSync(path.dirname(audioPath), { recursive: true, force: true });
    } catch {
      // Non-critical
    }
  }
}
