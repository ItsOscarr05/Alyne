import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { initRedis, deleteCachePattern, cacheKeys, deleteCache } from '../src/utils/cache';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test client user
  const clientPasswordHash = await bcrypt.hash('test123', 10);
  const clientUser = await prisma.user.upsert({
    where: { email: 'test@alyne.com' },
    update: {},
    create: {
      email: 'test@alyne.com',
      passwordHash: clientPasswordHash,
      firstName: 'Test',
      lastName: 'Client',
      userType: 'CLIENT',
      phoneNumber: '+1234567890',
      isVerified: true,
      clientProfile: {
        create: {},
      },
    },
    include: { clientProfile: true },
  });
  console.log('✅ Created test client:', clientUser.email);

  // Create test provider users
  const provider1PasswordHash = await bcrypt.hash('provider123', 10);
  const provider1 = await prisma.user.upsert({
    where: { email: 'yoga@alyne.com' },
    update: {},
    create: {
      email: 'yoga@alyne.com',
      passwordHash: provider1PasswordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      userType: 'PROVIDER',
      phoneNumber: '+1234567891',
      isVerified: true,
      profilePhoto: 'https://i.pravatar.cc/150?img=1',
      providerProfile: {
        create: {
          bio: 'Certified yoga instructor with 10 years of experience. Specializing in Vinyasa and Hatha yoga.',
          specialties: ['Yoga', 'Meditation', 'Mindfulness'],
          serviceArea: {
            center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
            radius: 25, // 25km radius
          },
          isActive: true,
        },
      },
    },
    include: { providerProfile: true },
  });

  if (provider1.providerProfile) {
    // Add services
    await prisma.service.createMany({
      data: [
        {
          providerId: provider1.providerProfile.id,
          name: '60-Minute Yoga Session',
          description: 'One-on-one yoga session tailored to your needs',
          duration: 60,
          price: 75.0,
          isActive: true,
        },
        {
          providerId: provider1.providerProfile.id,
          name: '90-Minute Deep Stretch',
          description: 'Extended session focusing on flexibility and relaxation',
          duration: 90,
          price: 100.0,
          isActive: true,
        },
      ],
    });

    // Add availability slots (next 7 days, 9am-5pm)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slots = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      for (let hour = 9; hour < 17; hour++) {
        slots.push({
          providerId: provider1.providerProfile.id,
          dayOfWeek: date.getDay(),
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isRecurring: day === 0, // Only first day is recurring
        });
      }
    }
    await prisma.availabilitySlot.createMany({ data: slots });
  }
  console.log('✅ Created provider 1:', provider1.email);

  // Create second provider
  const provider2PasswordHash = await bcrypt.hash('provider123', 10);
  const provider2 = await prisma.user.upsert({
    where: { email: 'massage@alyne.com' },
    update: {},
    create: {
      email: 'massage@alyne.com',
      passwordHash: provider2PasswordHash,
      firstName: 'Michael',
      lastName: 'Chen',
      userType: 'PROVIDER',
      phoneNumber: '+1234567892',
      isVerified: true,
      profilePhoto: 'https://i.pravatar.cc/150?img=12',
      providerProfile: {
        create: {
          bio: 'Licensed massage therapist specializing in deep tissue and sports massage.',
          specialties: ['Massage Therapy', 'Deep Tissue', 'Sports Recovery'],
          serviceArea: {
            center: { lat: 37.7849, lng: -122.4094 },
            radius: 20,
          },
          isActive: true,
        },
      },
    },
    include: { providerProfile: true },
  });

  if (provider2.providerProfile) {
    await prisma.service.createMany({
      data: [
        {
          providerId: provider2.providerProfile.id,
          name: '60-Minute Deep Tissue Massage',
          description: 'Therapeutic deep tissue massage',
          duration: 60,
          price: 90.0,
          isActive: true,
        },
        {
          providerId: provider2.providerProfile.id,
          name: '90-Minute Full Body Massage',
          description: 'Comprehensive full body massage session',
          duration: 90,
          price: 130.0,
          isActive: true,
        },
      ],
    });

    // Add availability
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slots2 = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      for (let hour = 10; hour < 18; hour++) {
        slots2.push({
          providerId: provider2.providerProfile.id,
          dayOfWeek: date.getDay(),
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isRecurring: day === 0,
        });
      }
    }
    await prisma.availabilitySlot.createMany({ data: slots2 });
  }
  console.log('✅ Created provider 2:', provider2.email);

  // Create third provider (Emily) - Delete existing data first to ensure fresh data
  console.log('🗑️  Cleaning up existing Emily data...');
  const existingEmily = await prisma.user.findUnique({
    where: { email: 'nutrition@alyne.com' },
    include: { providerProfile: true },
  });

  if (existingEmily) {
    // Delete all related data for Emily
    if (existingEmily.providerProfile) {
      // Delete bookings, reviews, messages, etc. associated with Emily
      await prisma.booking.deleteMany({
        where: { providerId: existingEmily.id },
      });
      await prisma.review.deleteMany({
        where: { providerId: existingEmily.id },
      });
      await prisma.message.deleteMany({
        where: { OR: [{ senderId: existingEmily.id }, { receiverId: existingEmily.id }] },
      });
      await prisma.service.deleteMany({
        where: { providerId: existingEmily.providerProfile.id },
      });
      await prisma.credential.deleteMany({
        where: { providerId: existingEmily.providerProfile.id },
      });
      await prisma.availabilitySlot.deleteMany({
        where: { providerId: existingEmily.providerProfile.id },
      });
      await prisma.providerProfile.delete({
        where: { id: existingEmily.providerProfile.id },
      });
    }
    await prisma.user.delete({
      where: { id: existingEmily.id },
    });
    console.log('✅ Deleted existing Emily data');
    
    // Clear cache for Emily
    await initRedis();
    await deleteCache(cacheKeys.provider(existingEmily.id));
    await deleteCachePattern('providers:list:*');
    console.log('✅ Cleared cache for Emily');
  }

  const provider3PasswordHash = await bcrypt.hash('provider123', 10);
  const provider3 = await prisma.user.create({
    data: {
      email: 'nutrition@alyne.com',
      passwordHash: provider3PasswordHash,
      firstName: 'Emily',
      lastName: 'Rodriguez',
      userType: 'PROVIDER',
      phoneNumber: '+1234567893',
      isVerified: true,
      profilePhoto: 'https://i.pravatar.cc/150?img=5',
      providerProfile: {
        create: {
          bio: 'Registered dietitian helping clients achieve their health goals through personalized nutrition plans.',
          specialties: ['Nutrition', 'Meal Planning', 'Weight Management'],
          serviceArea: {
            center: { lat: 37.7649, lng: -122.4294 },
            radius: 30,
          },
          isActive: true,
        },
      },
    },
    include: { providerProfile: true },
  });

  if (provider3.providerProfile) {
    // Add more services for Emily
    await prisma.service.createMany({
      data: [
        {
          providerId: provider3.providerProfile.id,
          name: 'Initial Consultation',
          description: 'Comprehensive nutrition assessment and goal setting',
          duration: 60,
          price: 120.0,
          isActive: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Follow-up Session',
          description: 'Progress review and plan adjustments',
          duration: 30,
          price: 60.0,
          isActive: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Meal Plan Creation',
          description: 'Customized weekly meal plan based on your goals and preferences',
          duration: 45,
          price: 90.0,
          isActive: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Nutrition Coaching',
          description: 'Ongoing support and accountability for your nutrition journey',
          duration: 30,
          price: 75.0,
          isActive: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Grocery Shopping Guide',
          description: 'Personalized grocery list and shopping strategies',
          duration: 30,
          price: 55.0,
          isActive: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Weight Management Program',
          description: 'Comprehensive 12-week program with weekly check-ins',
          duration: 60,
          price: 150.0,
          isActive: true,
        },
      ],
    });

    // Add credentials for Emily
    await prisma.credential.createMany({
      data: [
        {
          providerId: provider3.providerProfile.id,
          name: 'Registered Dietitian (RD)',
          issuer: 'Academy of Nutrition and Dietetics',
          isVerified: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Certified Nutrition Specialist (CNS)',
          issuer: 'Board for Certification of Nutrition Specialists',
          isVerified: true,
        },
        {
          providerId: provider3.providerProfile.id,
          name: 'Weight Management Specialist',
          issuer: 'American Council on Exercise',
          isVerified: true,
        },
      ],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slots3 = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      for (let hour = 9; hour < 16; hour++) {
        slots3.push({
          providerId: provider3.providerProfile.id,
          dayOfWeek: date.getDay(),
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isRecurring: day === 0,
        });
      }
    }
    await prisma.availabilitySlot.createMany({ data: slots3 });

    // Create multiple bookings for Emily
    const services = await prisma.service.findMany({
      where: { providerId: provider3.providerProfile.id },
    });

    if (services.length > 0) {
      const now = new Date();
      const bookings = [];

      // Create 3 pending bookings
      for (let i = 0; i < 3; i++) {
        const bookingDate = new Date(now);
        bookingDate.setDate(bookingDate.getDate() + i + 1);
        bookingDate.setHours(10 + i, 0, 0, 0);

        bookings.push({
          clientId: clientUser.id,
          providerId: provider3.id,
          serviceId: services[i % services.length].id,
          scheduledDate: bookingDate,
          scheduledTime: `${10 + i}:00`,
          status: 'PENDING' as const,
          price: services[i % services.length].price,
          location: JSON.stringify({
            address: `${123 + i} Main St, San Francisco, CA 94102`,
            coordinates: { lat: 37.7749 + (i * 0.01), lng: -122.4194 + (i * 0.01) },
          }),
          notes: i === 0 ? 'First-time client, interested in weight management' : undefined,
        });
      }

      // Create pending bookings
      if (bookings.length > 0) {
        await prisma.booking.createMany({ data: bookings });
      }

      // Create 5 upcoming/confirmed bookings
      for (let i = 0; i < 5; i++) {
        const bookingDate = new Date(now);
        bookingDate.setDate(bookingDate.getDate() + i + 3);
        bookingDate.setHours(14 + (i % 3), 0, 0, 0);

        const booking = await prisma.booking.create({
          data: {
            clientId: clientUser.id,
            providerId: provider3.id,
            serviceId: services[i % services.length].id,
            scheduledDate: bookingDate,
            scheduledTime: `${14 + (i % 3)}:00`,
            status: 'CONFIRMED' as const,
            price: services[i % services.length].price,
            location: JSON.stringify({
              address: `${456 + i} Market St, San Francisco, CA 94103`,
              coordinates: { lat: 37.7849 + (i * 0.01), lng: -122.4094 + (i * 0.01) },
            }),
          },
        });

        // Create payment for confirmed bookings
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.price,
            platformFee: booking.price * 0.075,
            providerAmount: booking.price * 0.925,
            status: 'completed',
            stripePaymentId: `pi_test_${booking.id}`,
          },
        });
      }

      // Create 12 completed bookings with reviews
      const reviewRatings = [5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5]; // Mix of 4s and 5s for ~4.8 avg
      const reviewComments = [
        'Emily is amazing! She helped me understand my nutritional needs and created a perfect meal plan.',
        'Very professional and knowledgeable. The consultation was thorough and personalized.',
        'Great experience overall. Would recommend to anyone looking for nutrition guidance.',
        'Emily provided excellent support throughout my weight management journey. Highly recommend!',
        'The meal plans are practical and easy to follow. I\'ve seen great results!',
        'Knowledgeable and friendly. Made me feel comfortable discussing my health goals.',
        'Best nutritionist I\'ve worked with. The follow-up sessions are very helpful.',
        'Emily really knows her stuff. The grocery shopping guide was a game-changer!',
        'Professional, caring, and results-oriented. I\'m so happy with my progress!',
        'Good service, though I wish the sessions were a bit longer.',
        'Excellent nutrition coaching! Emily is patient and explains everything clearly.',
        'Highly recommend Emily for anyone serious about improving their nutrition!',
      ];

      for (let i = 0; i < 12; i++) {
        const bookingDate = new Date(now);
        bookingDate.setDate(bookingDate.getDate() - (i + 1) * 7); // Spread over 12 weeks
        bookingDate.setHours(11 + (i % 4), 0, 0, 0);

        const completedBooking = await prisma.booking.create({
          data: {
            clientId: clientUser.id,
            providerId: provider3.id,
            serviceId: services[i % services.length].id,
            scheduledDate: bookingDate,
            scheduledTime: `${11 + (i % 4)}:00`,
            status: 'COMPLETED' as const,
            price: services[i % services.length].price,
            location: JSON.stringify({
              address: `${789 + i} Mission St, San Francisco, CA 94105`,
              coordinates: { lat: 37.7949 - (i * 0.01), lng: -122.3994 - (i * 0.01) },
            }),
          },
        });

        // Create payment for completed booking
        await prisma.payment.create({
          data: {
            bookingId: completedBooking.id,
            amount: completedBooking.price,
            platformFee: completedBooking.price * 0.075,
            providerAmount: completedBooking.price * 0.925,
            status: 'completed',
            stripePaymentId: `pi_completed_${completedBooking.id}`,
          },
        });

        // Create review for completed booking
        await prisma.review.create({
          data: {
            bookingId: completedBooking.id,
            clientId: clientUser.id,
            providerId: provider3.id,
            rating: reviewRatings[i],
            comment: reviewComments[i],
            isVisible: true,
            isFlagged: false,
          },
        });
      }

      console.log('✅ Created bookings, payments, and reviews for Emily');
      
      // Clear cache after creating all Emily's data
      await initRedis();
      await deleteCache(cacheKeys.provider(provider3.id));
      await deleteCachePattern('providers:list:*');
      await deleteCachePattern('bookings:*');
      console.log('✅ Cleared cache after creating Emily\'s data');
    }
  }
  console.log('✅ Created provider 3:', provider3.email);

  // Create test messages for Phase 3 testing
  console.log('💬 Creating test messages...');
  
  // Create conversation between client and provider1 (yoga@alyne.com)
  const messages = [
    {
      senderId: clientUser.id,
      receiverId: provider1.id,
      content: 'Hi! I\'m interested in booking a yoga session. Are you available this weekend?',
      status: 'READ' as const,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      senderId: provider1.id,
      receiverId: clientUser.id,
      content: 'Hello! Yes, I have availability this weekend. What time works best for you?',
      status: 'READ' as const,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 2 days ago + 30 min
    },
    {
      senderId: clientUser.id,
      receiverId: provider1.id,
      content: 'Saturday morning around 10am would be perfect!',
      status: 'READ' as const,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      senderId: provider1.id,
      receiverId: clientUser.id,
      content: 'Perfect! I\'ll send you a booking request. Looking forward to our session!',
      status: 'DELIVERED' as const,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 1 day ago + 15 min
    },
    {
      senderId: clientUser.id,
      receiverId: provider1.id,
      content: 'Great, thank you! See you Saturday!',
      status: 'SENT' as const,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  ];

  // Check if messages already exist to avoid duplicates
  const existingMessages = await prisma.message.findFirst({
    where: {
      senderId: clientUser.id,
      receiverId: provider1.id,
    },
  });

  if (!existingMessages) {
    await prisma.message.createMany({
      data: messages,
    });
    console.log('✅ Created test conversation between client and provider1');
  } else {
    console.log('ℹ️  Test messages already exist, skipping...');
  }

  // Create another conversation between client and provider2 (massage@alyne.com)
  const messages2 = [
    {
      senderId: provider2.id,
      receiverId: clientUser.id,
      content: 'Hi! I saw you were looking for massage services. I have availability this week!',
      status: 'SENT' as const,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      senderId: clientUser.id,
      receiverId: provider2.id,
      content: 'Thanks for reaching out! What types of massage do you offer?',
      status: 'DELIVERED' as const,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      senderId: provider2.id,
      receiverId: clientUser.id,
      content: 'I specialize in deep tissue and sports massage. I can also do Swedish massage for relaxation.',
      status: 'SENT' as const,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
  ];

  const existingMessages2 = await prisma.message.findFirst({
    where: {
      senderId: provider2.id,
      receiverId: clientUser.id,
    },
  });

  if (!existingMessages2) {
    await prisma.message.createMany({
      data: messages2,
    });
    console.log('✅ Created test conversation between client and provider2');
  } else {
    console.log('ℹ️  Test messages already exist, skipping...');
  }

  // Create multiple conversations for Emily (provider3)
  console.log('💬 Creating conversations for Emily...');
  
  // Create 5 different conversations with different clients
  const clientNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
  const clientEmails = ['alex@test.com', 'jordan@test.com', 'taylor@test.com', 'morgan@test.com', 'casey@test.com'];
  
  for (let i = 0; i < 5; i++) {
    const clientPasswordHash = await bcrypt.hash('test123', 10);
    const testClient = await prisma.user.upsert({
      where: { email: clientEmails[i] },
      update: {},
      create: {
        email: clientEmails[i],
        passwordHash: clientPasswordHash,
        firstName: clientNames[i],
        lastName: 'Client',
        userType: 'CLIENT',
        phoneNumber: `+123456789${10 + i}`,
        isVerified: true,
        clientProfile: {
          create: {},
        },
      },
    });

    const conversationMessages = [
      {
        senderId: testClient.id,
        receiverId: provider3.id,
        content: `Hi Emily! I'm interested in your nutrition services. Can you tell me more about your meal planning?`,
        status: 'READ' as const,
        createdAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000), // Different times
      },
      {
        senderId: provider3.id,
        receiverId: testClient.id,
        content: `Hello ${clientNames[i]}! I'd be happy to help. My meal planning service includes personalized weekly plans based on your goals, preferences, and dietary restrictions. Would you like to schedule a consultation?`,
        status: 'READ' as const,
        createdAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      },
      {
        senderId: testClient.id,
        receiverId: provider3.id,
        content: `That sounds perfect! What's your availability like this week?`,
        status: i < 2 ? 'READ' as const : 'DELIVERED' as const,
        createdAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
      {
        senderId: provider3.id,
        receiverId: testClient.id,
        content: `I have availability on ${['Monday', 'Wednesday', 'Friday'][i % 3]} and ${['Tuesday', 'Thursday', 'Saturday'][i % 3]}. Would either of those work?`,
        status: i < 3 ? 'READ' as const : 'SENT' as const,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
      },
    ];

    const existingConv = await prisma.message.findFirst({
      where: {
        senderId: testClient.id,
        receiverId: provider3.id,
      },
    });

    if (!existingConv) {
      await prisma.message.createMany({
        data: conversationMessages,
      });
      console.log(`✅ Created conversation between ${clientNames[i]} and Emily`);
    }
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Final cache clear for all provider-related data
    await initRedis();
    await deleteCachePattern('provider:*');
    await deleteCachePattern('providers:list:*');
    await deleteCachePattern('bookings:*');
    await deleteCachePattern('conversations:*');
    await deleteCachePattern('messages:*');
    console.log('✅ Cleared all relevant caches');
    
    await prisma.$disconnect();
  });

