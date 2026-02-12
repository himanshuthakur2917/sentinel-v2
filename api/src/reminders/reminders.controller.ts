import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
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
}
