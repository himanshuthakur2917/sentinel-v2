import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database';
import { AuditService } from '../../audit';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { CreateReminderDto } from '../dto/create-reminder.dto';

@Injectable()
export class VoiceService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(VoiceService.name);
  private readonly GLOBAL_TOKEN_LIMIT = 300000;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not found. AI features will be disabled.',
      );
    }
  }

  async processVoiceCommand(
    userId: string,
    file: Express.Multer.File,
  ): Promise<Partial<CreateReminderDto>> {
    if (!this.openai) {
      throw new Error('AI service is not configured');
    }

    // 1. Check Global Token Limit
    await this.checkGlobalTokenLimit();

    // 2. Transcribe Audio (Whisper)
    const transcript = await this.transcribeAudio(file);

    // 3. Interpret Command (GPT-4)
    const interpretedData = await this.interpretCommand(transcript);

    // 4. Log Usage
    // Estimate tokens: 1 word ~= 1.3 tokens. Very rough, but usable for transcript + prompt + output.
    const estimatedTokens = Math.ceil(
      (transcript.length + JSON.stringify(interpretedData).length) / 3,
    );
    await this.logTokenUsage(
      userId,
      estimatedTokens,
      'voice-reminder',
      'gpt-4',
    );

    // 5. Terminal Logging (User Request)
    await this.logUsageToTerminal(estimatedTokens);

    return interpretedData;
  }

  private async logUsageToTerminal(currentRequestTokens: number) {
    const totalUsed = await this.getTotalTokenUsage();
    const remaining = this.GLOBAL_TOKEN_LIMIT - totalUsed;
    const percentage = ((totalUsed / this.GLOBAL_TOKEN_LIMIT) * 100).toFixed(2);
    const timestamp = new Date().toLocaleString();

    // ANSI Colors
    const RESET = '\x1b[0m';
    const BRIGHT = '\x1b[1m';
    const CYAN = '\x1b[36m';
    const YELLOW = '\x1b[33m';
    const GREEN = '\x1b[32m';
    const RED = '\x1b[31m';

    console.log(`\n${CYAN}==========================================${RESET}`);
    console.log(`${BRIGHT}${YELLOW}[AI USAGE REPORT] ${RESET}| ${timestamp}`);
    console.log(`${CYAN}==========================================${RESET}`);
    console.log(
      `${GREEN}Request Usage    :${RESET} ${currentRequestTokens} tokens`,
    );
    console.log(
      `${GREEN}Total Used       :${RESET} ${totalUsed} / ${this.GLOBAL_TOKEN_LIMIT}`,
    );
    console.log(`${GREEN}Usage %          :${RESET} ${percentage}%`);

    if (remaining < 50000) {
      console.log(
        `${RED}Remaining        :${RESET} ${BRIGHT}${remaining}${RESET} (LOW QUOTA)`,
      );
    } else {
      console.log(
        `${CYAN}Remaining        :${RESET} ${BRIGHT}${remaining}${RESET}`,
      );
    }
    console.log(`${CYAN}==========================================\n${RESET}`);
  }

  private async getTotalTokenUsage(): Promise<number> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('ai_usage_logs')
      .select('tokens_used');

    if (error) {
      this.logger.error('Failed to fetch token usage for logging', error);
      return 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return (
      data?.reduce((acc: number, curr: any) => acc + curr.tokens_used, 0) || 0
    );
  }

  private async checkGlobalTokenLimit(): Promise<void> {
    const totalTokens = await this.getTotalTokenUsage();

    if (totalTokens >= this.GLOBAL_TOKEN_LIMIT) {
      this.logger.warn(
        `Global token limit reached: ${totalTokens}/${this.GLOBAL_TOKEN_LIMIT}`,
      );
      throw new Error('System AI token limit reached. Please contact support.');
    }
  }

  private async transcribeAudio(file: Express.Multer.File): Promise<string> {
    try {
      if (!this.openai) throw new Error('OpenAI not initialized');
      // Create a readable stream from the buffer
      const audioReadStream = Readable.from(file.buffer);

      // Hack to make the stream look like a file to OpenAI
      // @ts-expect-error - OpenAI SDK needs a path on the stream to confirm file type
      audioReadStream.path = 'upload.webm';

      const response = await this.openai.audio.transcriptions.create({
        file: audioReadStream as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        model: 'whisper-1',
      });

      return response.text;
    } catch (error: any) {
      this.logger.error('Transcription failed', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(
        'Failed to transcribe audio: ' + (error.message as string),
      );
    }
  }

  private async interpretCommand(
    transcript: string,
  ): Promise<Partial<CreateReminderDto>> {
    const systemPrompt = `
      You are an AI assistant that extracts reminder details from voice commands.
      Extract the following fields into a JSON object matching the TypeScript interface below:

      interface CreateReminderDto {
        title: string; // Required. Summary of the task.
        description?: string; // Optional. Extra details.
        category: 'personal' | 'work' | 'health' | 'other'; // Default to 'personal'.
        priority: 'low' | 'medium' | 'high'; // Default to 'medium'.
        initial_deadline: string; // ISO 8601 Date String. Calculate based on current time.
        is_recurring: boolean;
        recurrence_pattern?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | string;
      }

      Current Time: ${new Date().toISOString()}

      Rules:
      - If no time is specified, default to tomorrow at 9:00 AM.
      - If category is unclear, use 'personal'.
      - Be intelligent about inferring priority (e.g., "urgent", "important" -> 'high').
      - Return ONLY the raw JSON object. No markdown, no code blocks.
    `;

    try {
      if (!this.openai) throw new Error('OpenAI not initialized');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('No content from GPT');

      // Strip markdown code blocks if present (just in case)
      const jsonStr = content
        .replace(/^```json/, '')
        .replace(/```$/, '')
        .trim();

      return JSON.parse(jsonStr) as Partial<CreateReminderDto>;
    } catch (error: any) {
      this.logger.error('Interpretation failed', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(
        'Failed to interpret command: ' + (error.message as string),
      );
    }
  }

  private async logTokenUsage(
    userId: string,
    tokens: number,
    endpoint: string,
    model: string,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.from('ai_usage_logs').insert({
      user_id: userId,
      tokens_used: tokens,
      endpoint,
      model,
    });

    if (error) {
      this.logger.error('Failed to log token usage', error);
      // Don't throw here, just log error. User shouldn't be blocked if logging fails.
    }
  }
}
