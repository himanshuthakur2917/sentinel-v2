import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Controller('reminders/voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio'))
  async processVoice(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { clientTime?: string; language?: string },
  ) {
    if (!file) {
      throw new HttpException('Audio file is required', HttpStatus.BAD_REQUEST);
    }

    // ... (existing logging code) ...

    try {
      const user = req.user as JwtPayload;
      const userId = user?.sub;
      const clientTime = body.clientTime || new Date().toISOString();
      const language = body.language; // 'en' or 'hi' or undefined (auto-detect)

      console.log(`[VoiceController] Authenticated User ID: ${userId}`);
      console.log(`[VoiceController] Client Time: ${clientTime}`);
      console.log(`[VoiceController] Language: ${language || 'auto-detect'}`);

      if (!userId) {
        throw new HttpException(
          'User ID missing from token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.voiceService.processVoiceCommand(
        userId,
        file,
        clientTime,
        language,
      );
      return result;
    } catch (error: any) {
      // Nicer error mapping
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (error.message && error.message.includes('token limit')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new HttpException(
          error.message as string,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (error.message as string) || 'Internal Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
