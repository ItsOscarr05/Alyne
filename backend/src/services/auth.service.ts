import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/db';
import { createError } from '../middleware/errorHandler';
import { emailService } from '../utils/email';

type UserType = 'PROVIDER' | 'CLIENT';

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

  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    // Always return success message, but only send email if user exists
    if (!user) {
      // Log for debugging but don't reveal to client
      return;
    }

    // Generate 6-character alphanumeric reset code (uppercase letters and numbers)
    // Using crypto for secure random generation
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resetToken = '';
    const randomBytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      resetToken += characters[randomBytes[i] % characters.length];
    }
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      // Log error but don't fail the request
      // The token is still saved, user can request another email if needed
      console.error('Failed to send password reset email:', error);
      throw createError('Failed to send reset email. Please try again later.', 500);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw createError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401);
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw createError('New password must be different from current password', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });
  },

  async updateUser(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      profilePhoto?: string; // Base64 or URL for MVP
    }
  ) {
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

  async deleteAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        providerProfile: true,
        clientProfile: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Delete user (cascade will handle related records)
    // Prisma will automatically delete:
    // - ProviderProfile or ClientProfile (onDelete: Cascade)
    // - Bookings (onDelete: Cascade)
    // - Messages (onDelete: Cascade)
    // - Reviews (onDelete: Cascade)
    await prisma.user.delete({
      where: { id: userId },
    });
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
