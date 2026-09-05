// Provisions one host account: creates the Supabase Auth user (service-role,
// email pre-confirmed so there's no confirmation-link step) and promotes
// their auto-created `profiles` row to app_role='host' -- the one thing an
// organizer needs to log in and create games, no public /signup involved.
//
// Run from apps/server (so dotenv picks up its .env):
//   pnpm --filter @estate/server create-host -- host@example.com "TempPass123" "Host Name"
import { supabase } from '../src/supabase.js';

const [, , email, password, ...nameParts] = process.argv;
const fullName = nameParts.join(' ') || email;

if (!email || !password) {
  console.error('Usage: pnpm --filter @estate/server create-host -- <email> <password> ["Full Name"]');
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (error) {
  console.error(`Failed to create user: ${error.message}`);
  process.exit(1);
}

const { error: roleError } = await supabase
  .from('profiles')
  .update({ app_role: 'host' })
  .eq('id', data.user.id);
if (roleError) {
  console.error(`User was created but promoting them to host failed: ${roleError.message}`);
  console.error(`Fix by hand: update profiles set app_role = 'host' where id = '${data.user.id}';`);
  process.exit(1);
}

console.log('Host account created:');
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
console.log('  role:     host');
