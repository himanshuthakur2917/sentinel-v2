export interface JwtPayload {
  sub: string; // User ID
  email: string;
  phone: string;
  userType: 'student' | 'working_professional' | 'team_manager';
  iat?: number;
  exp?: number;
}
