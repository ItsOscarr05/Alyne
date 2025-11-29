/**
 * Find a booking without a payment for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTestBooking() {
  try {
    // Find a confirmed booking without a payment
    const booking = await prisma.booking.findFirst({
      where: {
        status: 'CONFIRMED',
        payment: null, // No payment exists
      },
      select: {
        id: true,
        price: true,
        status: true,
        clientId: true,
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
      console.log('\n✅ Found booking without payment:');
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   Service: ${booking.service.name}`);
      console.log(`   Price: $${booking.price}`);
      console.log(`   Client ID: ${booking.clientId}`);
      console.log(`\n   Use this ID: ${booking.id}`);
      return booking.id;
    } else {
      console.log('\n❌ No confirmed bookings without payments found.');
      console.log('   Creating a test booking...');
      
      // Get a client and provider
      const client = await prisma.user.findFirst({
        where: { userType: 'CLIENT' },
      });
      const provider = await prisma.user.findFirst({
        where: { 
          userType: 'PROVIDER',
          providerProfile: {
            isActive: true,
          },
        },
        include: {
          providerProfile: {
            include: {
              services: {
                where: { isActive: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!client || !provider || !provider.providerProfile?.services[0]) {
        console.log('   ❌ Cannot create test booking - missing client, provider, or service');
        return null;
      }

      const service = provider.providerProfile.services[0];
      const testBooking = await prisma.booking.create({
        data: {
          clientId: client.id,
          providerId: provider.id,
          serviceId: service.id,
          status: 'CONFIRMED',
          scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
          scheduledTime: '14:00',
          price: service.price,
        },
        select: {
          id: true,
          price: true,
        },
      });

      console.log(`\n✅ Created test booking:`);
      console.log(`   Booking ID: ${testBooking.id}`);
      console.log(`   Price: $${testBooking.price}`);
      console.log(`\n   Use this ID: ${testBooking.id}`);
      return testBooking.id;
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

findTestBooking();

