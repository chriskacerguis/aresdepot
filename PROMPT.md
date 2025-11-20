I am an Emergency coodiniator for the Amature Radio Emergency service (ARES).  I want to create an ExpressJS app with a frontend build with TailwindUI, and a sqlite backend (but have the ability to essily move to postgres when the system needs it) using all best pracites with moduluar code that is easy to read, update, and maintain.  

ARES has a tier structure for it's members.  When they complete a set standardized tasks (that are the same for all), and those each of those tasks have been "verified" they are marked as complete.  When they have completed all tasks for a teir, they have "achived" that teir.

The sytem should allow members to sign up with the name, address, email, phone, callsign (they will need a way to upload a PDF of their FCC license), and county.  A member should be able to login at any time and change those things.

An admin should be able to create one or more tiers, and then create one or more tasks for each tier.  Members should all have the same tasks / teirs to complete.

There are also a number of special achivements that are not part of a tier but they can complete, but they must upload proof (image or pdf).  An admin will need to verify that.  Then mark it as "verified" (keeping track of who verified it and when).

admins should be able to create a new event with details (location, minimum teir level to attend).  Members should be able to RSVP to those events (if they meet the teir level)...and they can "un-rsvp" if needed).

Members hsould be able to browse a members directory.

Admins should be able to run reports.  The list will expand, but it should be able to create event reports (where I get a list of members, their contact info) who sign up for events.