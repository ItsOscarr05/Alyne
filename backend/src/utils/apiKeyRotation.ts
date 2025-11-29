/**
 * API Key Rotation Reminder Utility
 * Tracks when API keys were last rotated and sends reminders
 */
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

interface KeyRotationRecord {
  keyName: string;
  lastRotated: string; // ISO date string
  nextRotationDue: string; // ISO date string
  rotationIntervalDays: number;
  notes?: string;
}

const ROTATION_FILE = path.join(__dirname, '../../.key-rotation.json');

/**
 * Default rotation intervals (in days)
 */
const DEFAULT_ROTATION_INTERVALS: Record<string, number> = {
  JWT_SECRET: 90,
  STRIPE_SECRET_KEY: 180,
  STRIPE_PUBLISHABLE_KEY: 180,
  PLAID_SECRET: 180,
  PLAID_CLIENT_ID: 180,
  DATABASE_URL: 90,
  REDIS_URL: 90,
};

class KeyRotationManager {
  private records: KeyRotationRecord[] = [];

  constructor() {
    this.loadRecords();
  }

  /**
   * Load rotation records from file
   */
  private loadRecords() {
    try {
      if (fs.existsSync(ROTATION_FILE)) {
        const data = fs.readFileSync(ROTATION_FILE, 'utf-8');
        this.records = JSON.parse(data);
      } else {
        // Initialize with default keys if file doesn't exist
        this.initializeDefaultKeys();
      }
    } catch (error) {
      logger.error('Error loading key rotation records', error);
      this.records = [];
    }
  }

  /**
   * Save rotation records to file
   */
  private saveRecords() {
    try {
      fs.writeFileSync(ROTATION_FILE, JSON.stringify(this.records, null, 2));
    } catch (error) {
      logger.error('Error saving key rotation records', error);
    }
  }

  /**
   * Initialize default keys with current date
   */
  private initializeDefaultKeys() {
    const now = new Date();
    this.records = Object.entries(DEFAULT_ROTATION_INTERVALS).map(([keyName, intervalDays]) => {
      const nextRotation = new Date(now);
      nextRotation.setDate(nextRotation.getDate() + intervalDays);
      
      return {
        keyName,
        lastRotated: now.toISOString(),
        nextRotationDue: nextRotation.toISOString(),
        rotationIntervalDays: intervalDays,
        notes: 'Initialized automatically',
      };
    });
    this.saveRecords();
  }

  /**
   * Record that a key was rotated
   */
  recordRotation(keyName: string, notes?: string) {
    const intervalDays = DEFAULT_ROTATION_INTERVALS[keyName] || 180;
    const now = new Date();
    const nextRotation = new Date(now);
    nextRotation.setDate(nextRotation.getDate() + intervalDays);

    const existingIndex = this.records.findIndex(r => r.keyName === keyName);
    const record: KeyRotationRecord = {
      keyName,
      lastRotated: now.toISOString(),
      nextRotationDue: nextRotation.toISOString(),
      rotationIntervalDays: intervalDays,
      notes,
    };

    if (existingIndex >= 0) {
      this.records[existingIndex] = record;
    } else {
      this.records.push(record);
    }

    this.saveRecords();
    logger.info(`Key rotation recorded: ${keyName}`, { record });
    return record;
  }

  /**
   * Get keys that are due for rotation
   */
  getKeysDueForRotation(daysBeforeDue: number = 7): KeyRotationRecord[] {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + daysBeforeDue);

    return this.records.filter(record => {
      const dueDate = new Date(record.nextRotationDue);
      return dueDate <= threshold;
    });
  }

  /**
   * Get all rotation records
   */
  getAllRecords(): KeyRotationRecord[] {
    return [...this.records];
  }

  /**
   * Check and log rotation reminders
   */
  checkRotationReminders() {
    const dueKeys = this.getKeysDueForRotation(7);
    const overdueKeys = this.getKeysDueForRotation(0);

    if (overdueKeys.length > 0) {
      logger.warn('⚠️  OVERDUE: The following API keys need to be rotated immediately:', {
        keys: overdueKeys.map(k => k.keyName),
      });
    }

    if (dueKeys.length > 0) {
      logger.info('🔔 REMINDER: The following API keys are due for rotation within 7 days:', {
        keys: dueKeys.map(k => ({
          name: k.keyName,
          dueDate: k.nextRotationDue,
          daysRemaining: Math.ceil((new Date(k.nextRotationDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        })),
      });
    }

    return {
      due: dueKeys,
      overdue: overdueKeys,
    };
  }

  /**
   * Get rotation status for a specific key
   */
  getKeyStatus(keyName: string): KeyRotationRecord | null {
    return this.records.find(r => r.keyName === keyName) || null;
  }
}

export const keyRotationManager = new KeyRotationManager();

// Check rotation reminders on module load (in production, this could be scheduled)
if (process.env.NODE_ENV === 'production') {
  // Run check every hour
  setInterval(() => {
    keyRotationManager.checkRotationReminders();
  }, 60 * 60 * 1000);
  
  // Also check immediately
  keyRotationManager.checkRotationReminders();
}

