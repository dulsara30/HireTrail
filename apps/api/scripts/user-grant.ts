import { connectDatabase } from '../src/core/db/connection';
import { UserModel } from '../src/modules/auth/models/user.model';
import { config } from '../src/config/config';

async function main() {
  const args = process.argv.slice(2);
  const emailIndex = args.findIndex((arg) => !arg.startsWith('--'));
  const confirm = args.includes('--confirm');
  const roleArg = args.find((arg) => arg.startsWith('--role='));
  const planArg = args.find((arg) => arg.startsWith('--plan='));

  if (emailIndex === -1) {
    console.error(
      'Usage: tsx scripts/user-grant.ts <email> [--role=ADMIN|USER] [--plan=PRO|FREE] --confirm',
    );
    process.exit(1);
  }

  const email = args[emailIndex]?.toLowerCase().trim();
  const role = roleArg ? (roleArg.split('=')[1] as 'ADMIN' | 'USER') : 'ADMIN';
  const plan = planArg ? (planArg.split('=')[1] as 'PRO' | 'FREE') : 'PRO';

  if (!confirm) {
    console.error(
      `Safety check: Please pass --confirm to grant role="${role}" and plan="${plan}" to user "${email}".`,
    );
    process.exit(1);
  }

  await connectDatabase(config.mongodbUri, config.mongodbDbName);

  const user = await UserModel.findOne({ email });
  if (!user) {
    console.error(`User with email "${email}" not found.`);
    process.exit(1);
  }

  user.role = role;
  user.plan = plan;
  user.planMeta = {
    source: 'MANUAL',
    updatedAt: new Date(),
    reason: 'Granted via user-grant script',
  };

  await user.save();
  console.log(`Success: Granted role="${role}" and plan="${plan}" to "${email}".`);
  process.exit(0);
}

main().catch((err) => {
  console.error('user-grant failed:', err);
  process.exit(1);
});
