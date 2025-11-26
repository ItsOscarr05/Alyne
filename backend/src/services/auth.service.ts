import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

type UserType = 'PROVIDER' | 'CLIENT';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  phoneNumber?: string;
}

interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    profilePhoto?: string;
    isVerified: boolean;
  };
  token: string;
}

export const authService = {
  async register(data: RegisterData): Promise<LoginResult> {
    const { email, password, firstName, lastName, userType, phoneNumber } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : [])],
      },
    });

    if (existingUser) {
      throw createError('Email or phone number already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        userType,
        phoneNumber,
        isVerified: false, // Email verification will be implemented later
      },
    });

    // Create profile based on user type
    if (userType === 'PROVIDER') {
      await prisma.providerProfile.create({
        data: {
          userId: user.id,
          specialties: [],
          serviceArea: {
            center: { lat: 0, lng: 0 },
            radius: 0,
          },
        },
      });
    } else {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        profilePhoto: user.profilePhoto || undefined,
        isVerified: user.isVerified,
      },
      token,
    };
  },

  async login(email: string, password: string): Promise<LoginResult> {
    // Test user for development - allows login with any password
    const isDevelopment = process.env.NODE_ENV === 'development';
    const TEST_USER_EMAIL = 'test@alyne.com';
    
    if (isDevelopment && email.toLowerCase() === TEST_USER_EMAIL.toLowerCase()) {
      // Find or create test user
      let user = await prisma.user.findUnique({
        where: { email: TEST_USER_EMAIL },
      });

      if (!user) {
        // Create test user if it doesn't exist
        const passwordHash = await bcrypt.hash('test123', 10);
        user = await prisma.user.create({
          data: {
            email: TEST_USER_EMAIL,
            passwordHash,
            firstName: 'Test',
            lastName: 'User',
            userType: 'CLIENT',
            isVerified: true,
          },
        });

        // Create client profile
        await prisma.clientProfile.create({
          data: {
            userId: user.id,
          },
        });
      }

      // Generate JWT token for test user
      const token = this.generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          profilePhoto: user.profilePhoto || undefined,
          isVerified: user.isVerified,
        },
        token,
      };
    }

    // Normal authentication flow
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw createError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        profilePhoto: user.profilePhoto || undefined,
        isVerified: user.isVerified,
      },
      token,
    };
  },

  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification token validation
    // For now, this is a placeholder
    throw createError('Email verification not yet implemented', 501);
  },

  async resendVerificationEmail(userId: string): Promise<void> {
    // TODO: Implement email verification resend
    // For now, this is a placeholder
    throw createError('Email verification not yet implemented', 501);
  },

  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    profilePhoto?: string; // Base64 or URL for MVP
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.firstName && { firstName: updates.firstName }),
        ...(updates.lastName && { lastName: updates.lastName }),
        ...(updates.phoneNumber && { phoneNumber: updates.phoneNumber }),
        ...(updates.profilePhoto && { profilePhoto: updates.profilePhoto }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      profilePhoto: user.profilePhoto || undefined,
      isVerified: user.isVerified,
    };
  },

  generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw createError('JWT_SECRET not configured', 500);
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ userId }, secret, {
      expiresIn,
    } as jwt.SignOptions);
  },
};

