/**
 * Geocoding utility for converting addresses to lat/lon coordinates
 */

/**
 * Geocode an address using Nominatim (OpenStreetMap) API
 * @param {string} address - Street address
 * @param {string} city - City name
 * @param {string} state - State abbreviation
 * @param {string} zip - ZIP code
 * @returns {Promise<{lat: number, lon: number} | null>} Coordinates or null if not found
 */
async function geocodeAddress(address, city, state, zip) {
  if (!address || !city || !state || !zip) {
    console.warn('Geocoding skipped: incomplete address');
    return null;
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip}`;
  
  try {
    // Using Nominatim geocoding service (free, but rate-limited to 1 request per second)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`,
      {
        headers: {
          'User-Agent': 'ARES-Depot-Member-Management'
        }
      }
    );

    if (!response.ok) {
      console.error(`Geocoding failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      
      console.log(`✅ Geocoded: ${fullAddress} -> ${lat}, ${lon}`);
      return { lat, lon };
    }

    console.warn(`No geocoding results for: ${fullAddress}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

module.exports = {
  geocodeAddress
};
