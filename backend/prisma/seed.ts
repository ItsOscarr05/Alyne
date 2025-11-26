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

