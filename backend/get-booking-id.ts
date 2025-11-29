/**
 * Quick script to get a confirmed booking ID for testing
 * Run with: pnpm tsx get-booking-id.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getBookingId() {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        price: true,
        status: true,
        clientId: true,
        providerId: true,
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (booking) {
      console.log('\n✅ Found a confirmed booking:');
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   Service: ${booking.service.name}`);
      console.log(`   Price: $${booking.price}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`\n   Use this ID in your test script: ${booking.id}`);
      return booking.id;
    } else {
      console.log('\n❌ No confirmed bookings found.');
      console.log('   Create a booking first or change status to CONFIRMED');
      return null;
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getBookingId();

