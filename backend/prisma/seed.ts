import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // Create third provider
  const provider3PasswordHash = await bcrypt.hash('provider123', 10);
  const provider3 = await prisma.user.upsert({
    where: { email: 'nutrition@alyne.com' },
    update: {},
    create: {
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

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

