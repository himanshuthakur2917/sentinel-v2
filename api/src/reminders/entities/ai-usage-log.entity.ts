export class AiUsageLog {
  id: string;
  user_id: string;
  tokens_used: number;
  endpoint: string; // e.g., 'voice-reminder', 'text-interpretation'
  model: string; // e.g., 'gpt-4', 'whisper-1'
  created_at: string;
}
