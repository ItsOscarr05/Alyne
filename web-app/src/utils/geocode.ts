/**
 * Geocode city and state to lat/lng using OpenStreetMap Nominatim.
 * Requires User-Agent per Nominatim usage policy.
 */
export async function geocodeCityState(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const q = `${city.trim()}, ${state.trim()}, USA`;
  if (!q.trim() || q === ', , USA') return null;

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Alyne-WebApp/1.0 (contact@alyne.app)',
        },
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  } catch {
    // Ignore geocoding errors - we can still save city/state without coordinates
  }
  return null;
}
