# Everett Alvarez Science Department website

This restores the original 203 Laboratory Checkout reservation page and adds access to the shared science inventory.

Replace the files in your Git website's published folder with all six files in this ZIP, commit, and publish:
- index.html: 203 lab reservation calendar and form
- styles.css: reservation page styling
- app.js: reservation availability and booking behavior
- config.js: the saved lab reservation API connection
- inventory.html: opens the existing shared inventory deployment
- README.md: these instructions

The reservation page retains its original 203 Lab Room calendar, class-period booking, 14-day reservation window, and AP Chemistry/AP Biology/Anatomy & Physiology priority rules. It uses the original reservation Apps Script endpoint saved on September 18.

The Science inventory button opens the department inventory Apps Script endpoint provided on September 29. The reservation and inventory deployments are separate. No Apps Script replacement is required for this website restoration.

Sign in using your school account when prompted. If reservation availability reports a connection error, the original reservation deployment needs its access settings or URL checked; preserve the inventory deployment as configured. Neither deployment could be verified in a signed-in school session during this restoration.
