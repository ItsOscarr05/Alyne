import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface DiscoveryFilters {
  location?: { lat: number; lng: number };
  radius?: number; // in miles
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availableNow?: boolean;
  search?: string;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const providerService = {
  async discoverProviders(filters: DiscoveryFilters) {
    try {
      const {
        location,
        radius = 20,
        serviceType,
        minPrice,
        maxPrice,
        minRating,
        availableNow,
        search,
      } = filters;

      // Get all active providers with their profiles
      let providers = await prisma.user.findMany({
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
              where: {
                isActive: true,
              },
            },
          },
        },
        reviewsReceived: {
          where: {
            isVisible: true,
            isFlagged: false,
          },
        },
      },
    });

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      providers = providers.filter((provider) => {
        const nameMatch = `${provider.firstName} ${provider.lastName}`.toLowerCase().includes(searchLower);
        const specialties = provider.providerProfile?.specialties || [];
        const specialtyMatch = specialties.some((s) =>
          s.toLowerCase().includes(searchLower)
        );
        return nameMatch || specialtyMatch;
      });
    }

    // Filter by service type
    if (serviceType) {
      providers = providers.filter((provider) => {
        return provider.providerProfile?.services.some((service) =>
          service.name.toLowerCase().includes(serviceType.toLowerCase())
        );
      });
    }

    // Calculate distances and filter by radius
    let providersWithDistance = providers
      .map((provider) => {
        const profile = provider.providerProfile;
        if (!profile) return null;

        let distance = 0;
        if (location && profile.serviceArea) {
          try {
            const serviceArea = profile.serviceArea as { center?: { lat?: number; lng?: number }; radius?: number };
            if (serviceArea?.center && typeof serviceArea.center.lat === 'number' && typeof serviceArea.center.lng === 'number') {
              distance = calculateDistance(
                location.lat,
                location.lng,
                serviceArea.center.lat,
                serviceArea.center.lng
              );
            }
          } catch (error) {
            console.error('Error calculating distance:', error);
            distance = 0;
          }
        }

        // Calculate average rating (reviews are on the user, not profile)
        const reviews = provider.reviewsReceived || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        // Get minimum service price
        const services = profile.services || [];
        const minServicePrice = services.length > 0
          ? Math.min(...services.map((s) => Number(s.price) || 0))
          : 0;

        return {
          id: provider.id,
          name: `${provider.firstName} ${provider.lastName}`,
          email: provider.email,
          profilePhoto: provider.profilePhoto,
          specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
          distance,
          startingPrice: minServicePrice,
          rating: avgRating,
          reviewCount: reviews.length,
          isAvailableNow: false, // TODO: Check actual availability
          bio: profile.bio,
          serviceArea: profile.serviceArea,
        };
      })
      .filter((p) => p !== null) as Array<{
        id: string;
        name: string;
        email: string;
        profilePhoto: string | null;
        specialties: string[];
        distance: number;
        startingPrice: number;
        rating: number;
        reviewCount: number;
        isAvailableNow: boolean;
        bio: string | null;
        serviceArea: any;
      }>;

    // Filter by distance
    if (location) {
      providersWithDistance = providersWithDistance.filter((p) => p.distance <= radius);
    }

    // Filter by price range
    if (minPrice !== undefined) {
      providersWithDistance = providersWithDistance.filter((p) => p.startingPrice >= minPrice);
    }
    if (maxPrice !== undefined) {
      providersWithDistance = providersWithDistance.filter((p) => p.startingPrice <= maxPrice);
    }

    // Filter by rating
    if (minRating !== undefined) {
      providersWithDistance = providersWithDistance.filter((p) => p.rating >= minRating);
    }

    // Filter by availability (placeholder - needs actual availability check)
    if (availableNow) {
      providersWithDistance = providersWithDistance.filter((p) => p.isAvailableNow);
    }

    // Sort by distance if location provided, otherwise by rating
    if (location) {
      providersWithDistance.sort((a, b) => a.distance - b.distance);
    } else {
      providersWithDistance.sort((a, b) => b.rating - a.rating);
    }

    return providersWithDistance;
    } catch (error) {
      console.error('Error in discoverProviders:', error);
      throw error;
    }
  },

  async getProviderById(providerId: string) {
    const provider = await prisma.user.findUnique({
      where: {
        id: providerId,
        userType: 'PROVIDER',
      },
      include: {
        providerProfile: {
          include: {
            services: {
              where: {
                isActive: true,
              },
            },
            credentials: {
              where: {
                isVerified: true,
              },
            },
            availability: true,
          },
        },
        reviewsReceived: {
          where: {
            isVisible: true,
            isFlagged: false,
          },
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!provider || !provider.providerProfile) {
      return null;
    }

    const reviews = provider.reviewsReceived || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      id: provider.id,
      name: `${provider.firstName} ${provider.lastName}`,
      email: provider.email,
      profilePhoto: provider.profilePhoto,
      bio: provider.providerProfile.bio,
      specialties: Array.isArray(provider.providerProfile.specialties) 
        ? provider.providerProfile.specialties 
        : [],
      serviceArea: provider.providerProfile.serviceArea,
      services: provider.providerProfile.services,
      credentials: provider.providerProfile.credentials,
      availability: provider.providerProfile.availability,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        client: r.client,
      })),
      rating: avgRating,
      reviewCount: reviews.length,
      isVerified: provider.isVerified,
    };
  },

  async getProviderServices(providerId: string) {
    const provider = await prisma.user.findUnique({
      where: {
        id: providerId,
        userType: 'PROVIDER',
      },
      include: {
        providerProfile: {
          include: {
            services: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    return provider?.providerProfile?.services || [];
  },

  async getProviderReviews(providerId: string) {
    const provider = await prisma.user.findUnique({
      where: {
        id: providerId,
        userType: 'PROVIDER',
      },
      include: {
        providerProfile: {
          include: {
            reviews: {
              where: {
                isVisible: true,
                isFlagged: false,
              },
              include: {
                client: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    return provider?.providerProfile?.reviews || [];
  },

  async getProviderByUserId(userId: string) {
    return this.getProviderById(userId);
  },

  async createOrUpdateProfile(userId: string, profileData: any) {
    // Check if profile exists
    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      // Update existing profile
      return await prisma.providerProfile.update({
        where: { userId },
        data: {
          bio: profileData.bio,
          specialties: profileData.specialties || [],
          serviceArea: profileData.serviceArea,
          isActive: profileData.isActive !== undefined ? profileData.isActive : true,
        },
        include: {
          services: true,
          credentials: true,
          availability: true,
        },
      });
    } else {
      // Create new profile
      return await prisma.providerProfile.create({
        data: {
          userId,
          bio: profileData.bio,
          specialties: profileData.specialties || [],
          serviceArea: profileData.serviceArea || {
            center: { lat: 0, lng: 0 },
            radius: 0,
          },
        },
        include: {
          services: true,
          credentials: true,
          availability: true,
        },
      });
    }
  },

  async createService(userId: string, serviceData: {
    name: string;
    description?: string;
    price: number;
    duration: number;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    return await prisma.service.create({
      data: {
        providerId: profile.id,
        name: serviceData.name,
        description: serviceData.description,
        price: serviceData.price,
        duration: serviceData.duration,
      },
    });
  },

  async updateService(userId: string, serviceId: string, serviceData: {
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    isActive?: boolean;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify service belongs to provider
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId: profile.id,
      },
    });

    if (!service) {
      throw createError('Service not found', 404);
    }

    return await prisma.service.update({
      where: { id: serviceId },
      data: serviceData,
    });
  },

  async deleteService(userId: string, serviceId: string) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify service belongs to provider
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId: profile.id,
      },
    });

    if (!service) {
      throw createError('Service not found', 404);
    }

    return await prisma.service.delete({
      where: { id: serviceId },
    });
  },

  async createCredential(userId: string, credentialData: {
    name: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    documentUrl?: string;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    return await prisma.credential.create({
      data: {
        providerId: profile.id,
        name: credentialData.name,
        issuer: credentialData.issuer,
        issueDate: credentialData.issueDate ? new Date(credentialData.issueDate) : null,
        expiryDate: credentialData.expiryDate ? new Date(credentialData.expiryDate) : null,
        documentUrl: credentialData.documentUrl,
      },
    });
  },

  async updateCredential(userId: string, credentialId: string, credentialData: {
    name?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    documentUrl?: string;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify credential belongs to provider
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        providerId: profile.id,
      },
    });

    if (!credential) {
      throw createError('Credential not found', 404);
    }

    return await prisma.credential.update({
      where: { id: credentialId },
      data: {
        ...credentialData,
        issueDate: credentialData.issueDate ? new Date(credentialData.issueDate) : undefined,
        expiryDate: credentialData.expiryDate ? new Date(credentialData.expiryDate) : undefined,
      },
    });
  },

  async deleteCredential(userId: string, credentialId: string) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify credential belongs to provider
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        providerId: profile.id,
      },
    });

    if (!credential) {
      throw createError('Credential not found', 404);
    }

    return await prisma.credential.delete({
      where: { id: credentialId },
    });
  },

  async createAvailability(userId: string, availabilityData: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
    specificDate?: string;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    return await prisma.availabilitySlot.create({
      data: {
        providerId: profile.id,
        dayOfWeek: availabilityData.dayOfWeek,
        startTime: availabilityData.startTime,
        endTime: availabilityData.endTime,
        isRecurring: availabilityData.isRecurring !== undefined ? availabilityData.isRecurring : true,
        specificDate: availabilityData.specificDate ? new Date(availabilityData.specificDate) : null,
      },
    });
  },

  async updateAvailability(userId: string, availabilityId: string, availabilityData: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    isRecurring?: boolean;
    specificDate?: string;
  }) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify availability belongs to provider
    const availability = await prisma.availabilitySlot.findFirst({
      where: {
        id: availabilityId,
        providerId: profile.id,
      },
    });

    if (!availability) {
      throw createError('Availability slot not found', 404);
    }

    return await prisma.availabilitySlot.update({
      where: { id: availabilityId },
      data: {
        ...availabilityData,
        specificDate: availabilityData.specificDate ? new Date(availabilityData.specificDate) : undefined,
      },
    });
  },

  async deleteAvailability(userId: string, availabilityId: string) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw createError('Provider profile not found', 404);
    }

    // Verify availability belongs to provider
    const availability = await prisma.availabilitySlot.findFirst({
      where: {
        id: availabilityId,
        providerId: profile.id,
      },
    });

    if (!availability) {
      throw createError('Availability slot not found', 404);
    }

    return await prisma.availabilitySlot.delete({
      where: { id: availabilityId },
    });
  },
};

