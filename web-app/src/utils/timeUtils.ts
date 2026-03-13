export function formatTime12Hour(timeString: string): string {
  if (!timeString || typeof timeString !== 'string') {
    return '';
  }
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';
  if (isNaN(hour) || hour < 0 || hour > 23) {
    return timeString;
  }
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}
