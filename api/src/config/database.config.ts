import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
}));
