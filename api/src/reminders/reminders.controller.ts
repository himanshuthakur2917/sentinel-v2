import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /**
   * GET /reminders/dashboard/stats
   * Get individual user dashboard statistics
   */
  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser('sub') userId: string) {
    return this.remindersService.getDashboardStats(userId);
  }

  /**
   * GET /reminders/dashboard/team/stats
   * Get team manager dashboard statistics
   * Requires team_manager role
   */
  @Get('dashboard/team/stats')
  @Roles('team_manager')
  @UseGuards(RolesGuard)
  async getTeamStats(@CurrentUser('sub') managerId: string) {
    return this.remindersService.getTeamStats(managerId);
  }

  /**
   * GET /reminders/:id
   * Get a single reminder by ID
   * IMPORTANT: Must come before GET / to avoid route conflicts
   */
  @Get(':id')
  async findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.remindersService.findOne(userId, id);
  }

  /**
   * GET /reminders
   * Get user's reminders with optional filter
   * @param filter - 'all' | 'today' | 'overdue' | 'upcoming'
   */
  @Get()
  async getUserReminders(
    @CurrentUser('sub') userId: string,
    @Query('filter') filter?: 'all' | 'today' | 'overdue' | 'upcoming',
  ) {
    return this.remindersService.getUserReminders(userId, filter || 'all');
  }

  /**
   * POST /reminders
   * Create a new reminder
   */
  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createReminderDto: CreateReminderDto,
  ) {
    return this.remindersService.create(userId, createReminderDto);
  }

  /**
   * PATCH /reminders/:id
   * Update a reminder
   */
  @Patch(':id')
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    return this.remindersService.update(userId, id, updateReminderDto);
  }

  /**
   * DELETE /reminders/:id
   * Delete a reminder
   */
  @Delete(':id')
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.remindersService.delete(userId, id);
  }
}
