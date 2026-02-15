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
    clientTime?: string,
    language?: string,
  ): Promise<Partial<CreateReminderDto>> {
    if (!this.openai) {
      throw new Error('AI service is not configured');
    }

    // 1. Check Global Token Limit
    await this.checkGlobalTokenLimit();

    // 2. Transcribe Audio (Whisper)
    const transcript = await this.transcribeAudio(file, language);
    this.logger.debug(`Transcription Result: "${transcript}"`);

    // Filter hallucinations
    const cleanTranscript = transcript
      .trim()
      .toLowerCase()
      .replace(/[.,!?]/g, '');
    const hallucinations = [
      'you',
      'thank you',
      'subtitle by',
      'mbc',
      'subs by',
    ];

    if (
      !transcript ||
      transcript.length < 2 ||
      hallucinations.some(
        (h) => cleanTranscript.includes(h) && cleanTranscript.length < 20,
      )
    ) {
      this.logger.warn(
        `Discarding hallucination/empty transcript: "${transcript}"`,
      );
      throw new Error(
        'No speech detected. Please speak clearly into the microphone.',
      );
    }

    // 3. Interpret Command (GPT-4)
    const interpretedData = await this.interpretCommand(
      transcript,
      clientTime,
      language,
    );

    // 4. Log Usage
    // Estimate tokens: 1 word ~= 1.3 tokens. Very rough, but usable for transcript + prompt + output.
    const estimatedTokens = Math.ceil(
      (transcript.length + JSON.stringify(interpretedData).length) / 3,
    );
    await this.logTokenUsage(
      userId,
      estimatedTokens,
      'voice-reminder',
      'gpt-4o',
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
    console.log(
      `${BRIGHT}${YELLOW}[OpenAI API USAGE REPORT] ${RESET}| ${timestamp}`,
    );
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
      data?.reduce(
        (acc: number, curr: { tokens_used: number }) => acc + curr.tokens_used,
        0,
      ) || 0
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

  private async transcribeAudio(
    file: Express.Multer.File,
    language?: string,
  ): Promise<string> {
    try {
      if (!this.openai) throw new Error('OpenAI not initialized');
      // Create a readable stream from the buffer
      const audioReadStream = Readable.from(file.buffer);

      // Hack to make the stream look like a file to OpenAI
      (audioReadStream as any).path = 'upload.webm';

      const response = await this.openai.audio.transcriptions.create({
        file: audioReadStream as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        model: 'whisper-1',
        // Language hint improves accuracy. If not provided, Whisper auto-detects.
        // Supports: 'en' (English), 'hi' (Hindi), and 90+ other languages
        ...(language && { language }),
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
    clientTime?: string,
    language?: string,
  ): Promise<Partial<CreateReminderDto>> {
    const referenceTime = clientTime || new Date().toISOString();
    const isHindi = language === 'hi';

    const systemPrompt = `
      You are a multilingual AI assistant that extracts reminder details from voice commands in English and Hindi.
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

      Current User Time (Wall-Clock with Timezone): "${referenceTime}"
      
      Timezone Handling Rules:
      1. The "Current User Time" provided above is the GROUND TRUTH.
      2. If the user says "at 8pm" or "शाम 8 बजे", they mean 8pm in THEIR timezone.
      3. CAREFULLY calculate the target time based on the Current User Time.
      4. Output the 'initial_deadline' as a standard ISO 8601 string (e.g., YYYY-MM-DDTHH:mm:ss.sssZ).
      5. IMPORTANT: You must convert the user's local target time to UTC correctly before generating the ISO output.
      6. Example: If User Time is "Mon Feb 15 2026 20:00:00 GMT+0530" and they say "at 9pm", the target is 21:00:00 IST. You must convert 21:00 IST to UTC (which is 15:30 UTC) and output that.

      ${
        isHindi
          ? `
      Hindi Time Expressions (convert to 24-hour format):
      - सुबह (subah) = morning → 9:00 AM
      - दोपहर (dopahar) = afternoon → 2:00 PM
      - शाम (shaam) = evening → 6:00 PM
      - रात (raat) = night → 8:00 PM
      - आधी रात (aadhi raat) = midnight → 12:00 AM
      
      Hindi Date Expressions:
      - आज (aaj) = today
      - कल (kal) = tomorrow
      - परसों (parson) = day after tomorrow
      - अगले हफ्ते (agle hafte) = next week (+7 days)
      - अगले महीने (agle mahine) = next month
      - सोमवार (somvar) = Monday
      - मंगलवार (mangalvar) = Tuesday
      - बुधवार (budhvar) = Wednesday
      - गुरुवार (guruvar) = Thursday
      - शुक्रवार (shukravar) = Friday
      - शनिवार (shanivar) = Saturday
      - रविवार (ravivar) = Sunday
      
      Hindi Category Keywords:
      - काम/ऑफिस (kaam/office) → 'work'
      - स्वास्थ्य/डॉक्टर (swasthya/doctor) → 'health'
      - निजी/व्यक्तिगत (niji/vyaktigat) → 'personal'
      `
          : ''
      }

      Rules:
      - Accept commands in BOTH English and Hindi (or mix of both - Hinglish)
      - If no time is specified, default to next morning at 9:00 AM relative to user time.
      - If category is unclear, use 'personal'.
      - Be intelligent about inferring priority (e.g., "urgent"/"जरूरी", "important"/"महत्वपूर्ण" -> 'high').
      - Return ONLY the raw JSON object. No markdown, no code blocks.
      - Keep the title in the original language of the command.
    `;

    try {
      if (!this.openai) throw new Error('OpenAI not initialized');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `[User's Context Time: ${referenceTime}] Voice Command: "${transcript}"`,
          },
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
      this.logger.error(`Failed to log token usage: ${error.message}`, error);
      // Don't throw here, just log error. User shouldn't be blocked if logging fails.
    }
  }
}
