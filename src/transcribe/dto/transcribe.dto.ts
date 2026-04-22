import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export type TranscribeMode = 'transcript' | 'summary' | 'both';

export class TranscribeDto {
  @IsNotEmpty({ message: 'url is required' })
  @IsString()
  @IsUrl(
    {
      // Facebook URLs use many subdomains (m., www., web., etc.)
      require_tld: true,
      allow_underscores: false,
    },
    { message: 'url must be a valid URL' },
  )
  url: string;

  @IsOptional()
  @IsIn(['transcript', 'summary', 'both'], {
    message: 'mode must be one of: transcript, summary, both',
  })
  mode?: TranscribeMode = 'transcript';
}
