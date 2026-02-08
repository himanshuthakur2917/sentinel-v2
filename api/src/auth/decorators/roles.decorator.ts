import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict access to specific user types
 * @example @Roles('team_manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
