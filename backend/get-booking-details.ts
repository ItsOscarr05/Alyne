/**
 * Get booking details including client ID for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getBookingDetails() {
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
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        provider: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            providerProfile: {
              select: {
                bankAccountVerified: true,
                plaidAccountId: true,
              },
            },
          },
        },
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
      console.log('\n✅ Booking Details:');
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   Service: ${booking.service.name}`);
      console.log(`   Price: $${booking.price}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`\n   Client:`);
      console.log(`     ID: ${booking.clientId}`);
      console.log(`     Email: ${booking.client.email}`);
      console.log(`     Name: ${booking.client.firstName} ${booking.client.lastName}`);
      console.log(`\n   Provider:`);
      console.log(`     ID: ${booking.providerId}`);
      console.log(`     Email: ${booking.provider.email}`);
      console.log(`     Name: ${booking.provider.firstName} ${booking.provider.lastName}`);
      console.log(`     Bank Account Verified: ${booking.provider.providerProfile?.bankAccountVerified || false}`);
      console.log(`\n   ⚠️  For testing, you need to:`);
      console.log(`     1. Login as client (${booking.client.email}) to get a real JWT token`);
      console.log(`     2. Use that token instead of 'dev-token'`);
      console.log(`     3. Or update dev-token to use client ID: ${booking.clientId}`);
      
      return booking;
    } else {
      console.log('\n❌ No confirmed bookings found.');
      return null;
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getBookingDetails();

