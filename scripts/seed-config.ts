import { prisma } from '../src/lib/prisma';

async function main() {
    await prisma.systemConfig.upsert({
        where: { key: 'QB_BOOKING_URL' },
        update: {},
        create: { key: 'QB_BOOKING_URL', value: 'https://hostravel.net' },
    });
    console.log('Seeded QB_BOOKING_URL');
}

main().catch(console.error).finally(() => process.exit(0));
