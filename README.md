# EAHS Science Department Website

This package combines two working department systems behind one GitHub Pages homepage:

1. **203 Laboratory Checkout** — a GitHub Pages interface connected to the Room 203 Google Calendar through the existing Apps Script backend.
2. **Science Department Inventory** — a Google Apps Script app backed by the Everett Alvarez Science Department Inventory Google Sheet.

## Repository layout

- `index.html` — department homepage
- `lab-checkout.html` — Room 203 reservation page
- `inventory.html` — inventory page and embedded-app wrapper
- `app.js`, `config.js`, `styles.css` — lab checkout files
- `site-config.js`, `portal.css` — department portal files
- `lab-backend/` — existing Room 203 Apps Script backend
- `inventory-app/` — inventory Apps Script files and CSV references

## Deploy the inventory app

1. Open the **Everett Alvarez Science Department Inventory** Google Sheet.
2. Choose **Extensions → Apps Script**.
3. Replace `Code.gs` with `inventory-app/Code.gs`.
4. Add a Script file named `Catalog` and paste `inventory-app/Catalog.gs`.
5. Add an HTML file named `Index` and paste `inventory-app/Index.html`.
6. Save, select `getData`, click **Run**, and approve access.
7. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and restrict access to the school organization.
8. Copy the deployed URL ending in `/exec`.
9. In this GitHub repository, edit `site-config.js` and paste the URL:

```js
window.EAHS_SITE_CONFIG = {
  inventoryAppUrl: "https://script.google.com/a/macros/salinasuhsd.org/s/DEPLOYMENT_ID/exec"
};
```

10. Commit the change. GitHub Actions will republish the department site.

The inventory backend uses `ALLOWALL` for framing so the organization-restricted Apps Script can appear inside the GitHub page. Google authentication and the deployment's access restriction still control who can use it. The inventory page also includes an **Open full screen** option.

## Publish on GitHub Pages

Upload the contents of this folder to the repository root. Keep the existing GitHub Pages Actions workflow. After committing, the repository's Pages URL becomes the department homepage; the lab and inventory tools are linked from it.

## Inventory data rules

The Google Sheet remains the permanent inventory database. Do not use the standalone `inventory-app/Index.html` file as the live inventory because it opens a local demonstration when it is outside Apps Script.
