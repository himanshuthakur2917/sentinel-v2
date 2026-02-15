import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('reminders/voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio'))
  async processVoice(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('Audio file is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const userId = (req.user as any)?.id as string;
      const result = await this.voiceService.processVoiceCommand(userId, file);
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
