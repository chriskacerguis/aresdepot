# Calendar Subscription Feature

## Overview
The ARES Depot system now supports ICS calendar subscriptions with unique, secure per-user tokens. Members can subscribe to the event calendar in their favorite calendar applications (Google Calendar, Apple Calendar, Outlook, etc.).

## Features

### 1. Unique Per-User Tokens
- Each user gets a unique, randomly-generated 64-character hex token
- Tokens are stored in the `users.calendar_token` database column
- Tokens are automatically generated on first calendar page visit
- Tokens persist across sessions

### 2. Security
- **Token-based authentication**: No login required for ICS feed, uses secure token
- **User validation**: Feed only works for active members
- **Account status checking**: If user is banned/deactivated, feed stops working
- **Private URLs**: Each user gets their own unique URL that should not be shared

### 3. Event Filtering
- Feed only shows events the member is eligible to attend
- Respects tier requirements (only shows events member has achieved tier for)
- Shows all future events (past events excluded)
- Automatically updates when new events are added

## Usage

### For Members

1. **Access the Calendar Page**
   - Navigate to `/events/calendar`
   - Click the "Subscribe" button in the header

2. **Copy the Subscription URL**
   - Click "Copy" button to copy the unique calendar URL
   - URL format: `https://yourdomain.com/events/feed/{token}.ics`

3. **Subscribe in Calendar Apps**

   **Google Calendar:**
   1. Open Google Calendar settings
   2. Click "Add calendar" → "From URL"
   3. Paste the copied URL
   4. Click "Add calendar"

   **Apple Calendar (macOS/iOS):**
   1. Open Calendar app
   2. File → New Calendar Subscription (macOS) or Add Subscribed Calendar (iOS)
   3. Paste the copied URL
   4. Configure update frequency
   5. Click "Subscribe"

   **Microsoft Outlook:**
   1. Open Outlook
   2. Click "Add calendar" → "Subscribe from web"
   3. Paste the copied URL
   4. Name the calendar and click "Import"

### For Admins

**Revoking Access:**
- Change user status to "inactive" or delete the user
- The ICS feed will return a 404 error
- User's calendar app will stop receiving updates

**No manual token management needed** - tokens are automatically generated and managed.

## Technical Implementation

### Database Schema
```sql
ALTER TABLE users ADD COLUMN calendar_token TEXT UNIQUE;
```

### API Endpoint
**GET** `/events/feed/:token.ics`
- Public endpoint (no authentication required)
- Token-based access control
- Returns ICS (iCalendar) format
- Content-Type: `text/calendar; charset=utf-8`

### ICS Feed Properties
- **PRODID**: `-//ARES Depot//Event Calendar//EN`
- **CALSCALE**: `GREGORIAN`
- **METHOD**: `PUBLISH`
- **TIMEZONE**: `America/Chicago` (UTC timestamps used)
- **Event Duration**: 2 hours (default for all events)

### Event Properties Included
- **UID**: Unique identifier per event
- **SUMMARY**: Event name
- **DESCRIPTION**: Event description (if available)
- **LOCATION**: Event location (if available)
- **DTSTART/DTEND**: Event start/end times (UTC)
- **DTSTAMP**: Current timestamp
- **STATUS**: CONFIRMED

## Security Considerations

### Token Generation
```javascript
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
```
- 32 bytes = 256 bits of randomness
- Hex-encoded = 64 characters
- Virtually impossible to guess

### Validation
The feed validates:
1. Token exists and matches a user
2. User has a member profile (`member_id` not null)
3. Member status is "active"

If any validation fails, returns 404 (not 403 to avoid information disclosure).

### Token Privacy
- Tokens should be kept private by users
- Warning message displayed in UI: "Keep this URL private"
- If token is compromised, admin can deactivate the user account

## User Model Methods

### `User.getOrCreateCalendarToken(userId)`
Returns existing token or creates a new one if none exists.

```javascript
const token = await User.getOrCreateCalendarToken(req.session.user.id);
```

### `User.findByCalendarToken(token)`
Finds a user by their calendar token and includes member status.

```javascript
const user = await User.findByCalendarToken(token);
if (!user || !user.member_id || user.member_status !== 'active') {
  // Invalid or inactive
}
```

### `User.regenerateCalendarToken(userId)`
Generates a new token (for security purposes if old token is compromised).

```javascript
const newToken = await User.regenerateCalendarToken(userId);
```

## Update Frequency

Calendar apps typically check for updates:
- **Google Calendar**: Every few hours to daily
- **Apple Calendar**: Can be configured (hourly, daily, weekly)
- **Outlook**: Varies by version and settings

The ICS feed is generated dynamically on each request, so updates appear based on the calendar app's refresh schedule.

## Future Enhancements

Potential improvements:
- Add regenerate token button in user profile
- Track last feed access time for analytics
- Add webhook notifications for immediate calendar updates
- Support for all-day events
- Include RSVP status in event descriptions
- Add event categories/colors based on event type
- Export individual event ICS files for single-event imports

## Troubleshooting

**Calendar not updating?**
- Check calendar app's update frequency settings
- Manually refresh the subscription in the app
- Verify the member account is still active

**Feed returns 404?**
- User account may be inactive or deleted
- Token may have been regenerated
- Copy the new URL from the calendar page

**Events not showing?**
- User may not meet tier requirements for certain events
- Only future events are included
- Check event has a valid date

## File Changes

### Modified Files:
1. `src/database/migrate.js` - Added calendar_token column
2. `src/models/User.js` - Added token management methods
3. `src/routes/events.js` - Added ICS feed endpoint and token passing
4. `views/events/calendar.ejs` - Added subscription UI with dropdown
5. `views/layout.ejs` - Added Alpine.js for dropdown functionality
6. `server.js` - Updated CSP to allow Alpine.js CDN

### Dependencies:
- Alpine.js 3.x (loaded from CDN for dropdown functionality)
- No additional npm packages required

## Testing

To test the calendar subscription:

1. **Login as a member** (not admin)
2. **Navigate to calendar** (`/events/calendar`)
3. **Click "Subscribe"** button
4. **Copy the URL** from the dropdown
5. **Test the feed** by visiting the URL directly in a browser
   - Should download an ICS file
   - Open in text editor to verify format
6. **Subscribe in a calendar app**
7. **Verify events appear** in the calendar app
8. **Test deactivation** by setting member status to inactive
   - Feed should return 404

## Browser Compatibility

- Dropdown uses Alpine.js (modern browsers)
- Clipboard API for copy functionality (all modern browsers)
- Fallback alert if clipboard fails
- ICS format is universally supported by calendar apps
