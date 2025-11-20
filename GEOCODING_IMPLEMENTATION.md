# Geocoding Implementation

## Overview
The ARES Depot system now includes automatic geocoding of member addresses to improve map loading performance and provide better location-based features.

## Features Implemented

### 1. Database Schema Updates
- Added `latitude` (REAL) and `longitude` (REAL) columns to the `members` table
- Coordinates are stored when members register or update their addresses

### 2. Geocoding Utility (`src/utils/geocode.js`)
- Uses OpenStreetMap's Nominatim API for geocoding
- Rate-limited to 1 request per second (respects Nominatim usage policy)
- Includes proper User-Agent header: 'ARES-Depot-Member-Management'
- Returns `{lat, lon}` on success, `null` on failure
- Error handling and logging included

### 3. Registration Route (`src/routes/auth.js`)
**When a new member registers:**
- If address fields are provided (address, city, state, zip)
- System automatically geocodes the address
- Stores latitude/longitude in the database
- Registration continues even if geocoding fails

### 4. Profile Update Route (`src/routes/members.js`)
**When a member updates their profile:**
- Detects if address fields have changed
- Only re-geocodes if address was modified
- Uses existing cached coordinates if address unchanged
- Updates database with new coordinates when needed

### 5. Member Map Report (`views/admin/member-map-report.ejs`)
**Optimized map loading:**
- **First Pass**: Uses cached coordinates from database (instant loading)
- **Second Pass**: Only geocodes members with missing coordinates
- Shows progress: "Loaded X cached locations. Geocoding Y remaining..."
- Automatically caches newly geocoded coordinates via AJAX
- Map bounds auto-adjust to fit all member locations

### 6. Admin API Route (`src/routes/admin.js`)
**POST** `/admin/members/:id/geocode`
- Caches geocoded coordinates for a specific member
- Called automatically from map report when geocoding missing addresses
- Requires admin authentication

### 7. Seed Scripts
**Updated to pre-geocode all addresses:**
- `src/database/seed.js` - Geocodes admin user address
- `src/database/seed-members.js` - Geocodes all 20 member addresses during seeding
- Includes 1-second delay between requests
- Shows progress: "Geocoding X: [address] -> [lat, lon]"
- Console output shows success/failure for each address

## Performance Benefits

### Before (Without Caching):
- Map report: ~20 seconds to load (geocodes 20+ addresses every time)
- Sequential API calls with 1-second delays
- Risk of hitting rate limits with frequent map views

### After (With Caching):
- Map report: **Instant** (uses cached coordinates)
- Only geocodes on first registration or address change
- New geocoding only needed for members without coordinates
- 95%+ reduction in API calls to Nominatim

## Usage

### For Admins
1. Navigate to **Reports** → **Member Location Map**
2. Map loads instantly using cached coordinates
3. If any members lack coordinates, they're geocoded automatically
4. Click table rows to zoom to specific members on map

### For Members
1. Geocoding happens automatically during registration
2. Re-geocoding occurs automatically when updating address
3. No manual action required

### For Developers
```javascript
// Import the geocoding utility
const { geocodeAddress } = require('./utils/geocode');

// Geocode an address
const coords = await geocodeAddress(
  '301 W 2nd St', 
  'Austin', 
  'TX', 
  '78701'
);

if (coords) {
  console.log(`Latitude: ${coords.lat}, Longitude: ${coords.lon}`);
  // Store in database
  await Member.update(memberId, {
    latitude: coords.lat,
    longitude: coords.lon
  });
}
```

## Rate Limiting

To respect Nominatim's usage policy:
- Maximum 1 request per second
- User-Agent header required
- Delays built into seed scripts
- Map report geocodes sequentially with 1-second delays

## Error Handling

- Geocoding failures are logged but don't block operations
- Registration/updates continue even if geocoding fails
- Map displays members with coordinates only
- Console warnings show which addresses failed geocoding

## Database Migration

The migration adds two new columns to the `members` table:

```sql
ALTER TABLE members ADD COLUMN latitude REAL;
ALTER TABLE members ADD COLUMN longitude REAL;
```

Existing members will have `NULL` values until:
1. They update their profile (triggers re-geocoding)
2. Admin views the map report (auto-geocodes missing addresses)
3. Database is reseeded

## Testing

To test the geocoding system:

1. **Reset and seed database:**
   ```bash
   rm -f data/ares.db
   node src/database/migrate.js
   node src/database/seed.js
   node src/database/seed-members.js
   node src/database/seed-events.js
   ```

2. **View the map:**
   - Login as admin (ADMIN001 / ChangeThisPassword123!)
   - Navigate to Reports → Member Location Map
   - Should load instantly with 21 markers (admin + 20 members)

3. **Test registration:**
   - Register a new member with a valid Austin, TX address
   - Check database: `latitude` and `longitude` should be populated

4. **Test profile update:**
   - Login as existing member
   - Update address fields
   - Check database: coordinates should be updated

## API Compliance

This implementation complies with Nominatim's usage policy:
- ✅ Maximum 1 request per second
- ✅ User-Agent header included
- ✅ Caching implemented (reduces API calls)
- ✅ No bulk geocoding abuse
- ✅ Appropriate for low-volume usage

## Future Enhancements

Potential improvements:
- Add geocoding retry logic with exponential backoff
- Implement geocoding queue for background processing
- Add address validation before geocoding
- Support for alternative geocoding services (Google Maps API, etc.)
- Bulk geocoding command for existing members
- Map clustering for dense member locations
