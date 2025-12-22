import { prisma } from '../utils/db';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const clientService = {
  async updateProfile(userId: string, preferences: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || user.userType !== 'CLIENT') {
      throw createError('Client profile not found', 404);
    }

    // Update or create client profile
    if (user.clientProfile) {
      return await prisma.clientProfile.update({
        where: { userId },
        data: {
          preferences: preferences || {},
        },
      });
    } else {
      return await prisma.clientProfile.create({
        data: {
          userId,
          preferences: preferences || {},
        },
      });
    }
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || user.userType !== 'CLIENT') {
      throw createError('Client profile not found', 404);
    }

    return user.clientProfile;
  },
};
