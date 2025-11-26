import { Request, Response, NextFunction } from 'express';
import { providerService } from '../services/provider.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const providerController = {
  async discover(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        lat,
        lng,
        radius = '20',
        serviceType,
        minPrice,
        maxPrice,
        minRating,
        availableNow,
        search,
      } = req.query;

      const filters = {
        location: lat && lng ? { lat: parseFloat(lat as string), lng: parseFloat(lng as string) } : undefined,
        radius: parseFloat(radius as string),
        serviceType: serviceType as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        availableNow: availableNow === 'true',
        search: search as string | undefined,
      };

      const providers = await providerService.discoverProviders(filters);

      res.json({
        success: true,
        data: providers,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const provider = await providerService.getProviderById(id);

      if (!provider) {
        return next(createError('Provider not found', 404));
      }

      res.json({
        success: true,
        data: provider,
      });
    } catch (error) {
      next(error);
    }
  },

  async getServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const services = await providerService.getProviderServices(id);

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reviews = await providerService.getProviderReviews(id);

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  },

  async createOrUpdateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const profileData = req.body;
      const profile = await providerService.createOrUpdateProfile(userId, profileData);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const profile = await providerService.getProviderByUserId(userId);

      if (!profile) {
        return next(createError('Provider profile not found', 404));
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  async createService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const service = await providerService.createService(userId, req.body);

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      const service = await providerService.updateService(userId, id, req.body);

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      await providerService.deleteService(userId, id);

      res.json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async createCredential(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const credential = await providerService.createCredential(userId, req.body);

      res.json({
        success: true,
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateCredential(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      const credential = await providerService.updateCredential(userId, id, req.body);

      res.json({
        success: true,
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteCredential(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      await providerService.deleteCredential(userId, id);

      res.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async createAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const availability = await providerService.createAvailability(userId, req.body);

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      const availability = await providerService.updateAvailability(userId, id, req.body);

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      await providerService.deleteAvailability(userId, id);

      res.json({
        success: true,
        message: 'Availability slot deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

