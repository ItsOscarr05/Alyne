/**
 * One-time script: Set onboardingComplete = true for all existing provider profiles.
 * Run after adding the onboardingComplete column to the schema.
 *
 * Usage: npx tsx scripts/backfill-onboarding-complete.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.providerProfile.updateMany({
    data: { onboardingComplete: true },
  });
  console.log(`Updated ${result.count} provider profile(s) with onboardingComplete = true`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
