/**
 * Utility functions for time formatting and manipulation
 */

/**
 * Converts 24-hour time string (HH:MM) to 12-hour format (H:MM AM/PM)
 * @param timeString - Time in 24-hour format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(timeString: string): string {
  if (!timeString || typeof timeString !== 'string') {
    return '';
  }

  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';

  if (isNaN(hour) || hour < 0 || hour > 23) {
    return timeString; // Return original if invalid
  }

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

/**
 * Converts 12-hour time string to 24-hour format
 * @param timeString - Time in 12-hour format (e.g., "2:30 PM")
 * @returns Time in 24-hour format (e.g., "14:30")
 */
export function formatTime24Hour(timeString: string): string {
  if (!timeString || typeof timeString !== 'string') {
    return '';
  }

  const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    return timeString; // Return original if not in expected format
  }

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

/**
 * Generates time slots between start and end time with specified interval
 * @param startTime - Start time in 24-hour format (e.g., "09:00")
 * @param endTime - End time in 24-hour format (e.g., "17:00")
 * @param intervalMinutes - Interval between slots in minutes (default: 30)
 * @returns Array of time strings in 24-hour format
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += intervalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(time);
  }

  return slots;
}

/**
 * Gets the day of week (0 = Sunday, 1 = Monday, etc.) for a given date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Day of week (0-6)
 */
export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00');
  return date.getDay();
}

/**
 * Checks if a time slot is within provider availability for a given date
 * @param timeSlot - Time slot in 24-hour format (e.g., "14:30")
 * @param dateString - Date string in YYYY-MM-DD format
 * @param availability - Array of availability slots
 * @returns True if the time slot is available
 */
export function isTimeSlotAvailable(
  timeSlot: string,
  dateString: string,
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string; isRecurring: boolean; specificDate?: string }>
): boolean {
  const dayOfWeek = getDayOfWeek(dateString);
  
  // Find matching availability slots
  const matchingSlots = availability.filter(slot => {
    if (slot.specificDate) {
      // Check if specific date matches
      const specificDate = new Date(slot.specificDate);
      const selectedDate = new Date(dateString + 'T00:00:00');
      return specificDate.toDateString() === selectedDate.toDateString();
    } else if (slot.isRecurring) {
      // Check if day of week matches
      return slot.dayOfWeek === dayOfWeek;
    }
    return false;
  });

  if (matchingSlots.length === 0) {
    return false;
  }

  // Check if time slot falls within any matching availability slot
  const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
  const slotTotalMinutes = slotHour * 60 + slotMinute;

  return matchingSlots.some(slot => {
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    return slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes;
  });
}

