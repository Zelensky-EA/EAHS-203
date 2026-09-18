# EAHS Lab Space Checkout

A GitHub Pages booking site for one shared classroom lab. The front end displays only valid EAHS class periods; a Google Apps Script backend checks conflicts and writes confirmed reservations to the shared Google Calendar.

## Priority rule

- AP Chemistry, AP Biology, and Anatomy & Physiology can reserve any future available slot.
- Other courses can reserve up to 14 days ahead.
- An existing calendar event always blocks a slot. The backend uses a lock and checks again immediately before creating an event.

Change `NON_PRIORITY_DAYS` in `apps-script/Code.gs` and `nonPriorityAdvanceDays` in `config.js` if a different priority window is desired.

## 1. Set up Google Apps Script

1. Visit [script.google.com](https://script.google.com), create a new project, and name it **EAHS Lab Checkout API**.
2. Replace `Code.gs` with the contents of `apps-script/Code.gs`.
3. Open **Project Settings**, enable **Show appsscript.json manifest file**, then replace it with `apps-script/appsscript.json`.
4. Confirm the project time zone is **America/Los_Angeles**.
5. Click **Deploy → New deployment → Web app**.
6. Choose **Execute as: Me** and restrict access to your school organization if that choice is available. Do not publish an owner-executed calendar writer anonymously.
7. Authorize Calendar access and copy the deployment URL ending in `/exec`.
8. Paste that URL into `apiUrl` in `config.js`.

The Google account that deploys the script must have permission to create events on the supplied lab calendar.

## 2. Add minimum-day dates

The bell schedule provides minimum-day period times but the calendar-specific minimum-day dates should be confirmed. Add each date in `YYYY-MM-DD` format to both:

- `minimumDays` in `config.js`
- `MINIMUM_DAYS` in `apps-script/Code.gs`

## 3. Publish on GitHub Pages

1. Create a GitHub repository and upload everything in this folder.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Save. GitHub will display the public site URL after deployment.

## Testing checklist

- Open a current week and confirm regular, Wednesday, and Thursday periods.
- Make one priority-course reservation more than 14 days ahead.
- Confirm a non-priority course is blocked more than 14 days ahead.
- Confirm the event appears on the shared calendar and the teacher receives an invitation.
- In a second browser, verify the newly reserved slot is marked booked.

## Bell schedule source

[EAHS 2026–27 Bell Schedule](https://resources.finalsite.net/images/v1785859850/salinasuhsdorg/datex095hkn4gaalhypa/EAHS26-27BellSchedule.pdf)
