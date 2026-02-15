import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env from api/.env manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function testInsert() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
  }

  console.log('Initializing Supabase client...');
  // Log key type (anon vs service)
  const isService =
    key.includes('service_role') ||
    JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString()).role ===
      'service_role';
  console.log(`Key Type: ${isService ? 'SERVICE_ROLE' : 'ANON/OTHER'}`);

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('Attempting to check if table exists (via select)...');
  const { data: selectData, error: selectError } = await client
    .from('ai_usage_logs')
    .select('count')
    .limit(1);

  if (selectError) {
    console.error('SELECT Failed:', selectError.message);
    if (selectError.code === '42P01') {
      console.error('Table does not exist. Did you run the migration?');
    }
  } else {
    console.log('SELECT Success. Table exists.');
  }

  console.log('Attempting insert...');
  // We need a valid user_id to respect FK, OR we need the table to allow insertion if we are service role?
  // Service role bypasses RLS, but FK constraints are DB level.
  // We need a valid user ID. Let's try to fetch one first.

  const { data: users, error: userError } = await client
    .from('users')
    .select('id')
    .limit(1);
  if (userError || !users || users.length === 0) {
    console.error(
      'Could not fetch a valid user ID to test insert:',
      userError?.message || 'No users found',
    );
    return;
  }

  const testUserId = users[0].id;
  console.log(`Using Test User ID: ${testUserId}`);

  const { data, error } = await client
    .from('ai_usage_logs')
    .insert({
      user_id: testUserId,
      tokens_used: 5,
      endpoint: 'test-script',
      model: 'test-model',
    })
    .select();

  if (error) {
    console.error('INSERT Failed:', error);
  } else {
    console.log('INSERT Success:', data);
  }
}

testInsert();
