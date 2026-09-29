# Everett Alvarez Science Department Inventory

Updated September 29, 2026. Includes 1,181 catalog names: 255 core suggestions and 926 names from earlier orders and historical records.

## Website in Git

Replace the repository website file with the root `index.html`. This file includes its styling and JavaScript, so it works as a static site without a build step. Its preview uses sample inventory and saves changes in the current browser. Every teacher has separate browser data in this preview.

## Shared department app

For shared inventory, open the department Google Sheet:
https://docs.google.com/spreadsheets/d/1wdj8ZT4GrZ3JfSa_SGzT1uOQO5_FAtmkFHXKi0Xbb2k/edit

Open Extensions → Apps Script. Replace the Script files `Code` and `Catalog` with `apps-script/Code.gs` and `apps-script/Catalog.gs`, and the HTML file `Index` with `apps-script/Index.html`. Run `getData` once to authorize and initialize. Deploy as a Web app, execute as the owner, and restrict access to your school organization. For an existing deployment, choose Manage deployments → Edit → New version → Deploy. Give staff the deployed Web app URL.

Catalog entries marked Review require a staff choice of reusable or consumable and a verified physical count before saving inventory. The Order & Legacy References tab in the shared Sheet retains source records. Historical quantities do not populate current stock.

Features include imports, automatic EAHS SKU numbers, restocking, room counts, whole department totals, name matching, checkouts and returns, and repair/replacement reporting.
