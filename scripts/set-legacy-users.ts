// Script to set existing users to UNLIMITED plan
// Run this once: npx tsx scripts/set-legacy-users.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Setting existing users to UNLIMITED plan...');

    // Update all existing users to UNLIMITED
    const result = await prisma.user.updateMany({
        where: {
            plan: 'FREE' // Only update users who are still on FREE
        },
        data: {
            plan: 'UNLIMITED'
        }
    });

    console.log(`✓ Updated ${result.count} users to UNLIMITED plan`);

    // Show current user stats
    const stats = await prisma.user.groupBy({
        by: ['plan'],
        _count: true
    });

    console.log('\nCurrent user distribution:');
    stats.forEach(stat => {
        console.log(`  ${stat.plan}: ${stat._count} users`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
