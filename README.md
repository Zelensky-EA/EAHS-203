# Everett Alvarez Science Department Inventory

The shared Google Sheet is the permanent data store. The Apps Script web app is the staff entry interface. The equipment catalog supplies consistent suggested item names and sizes; it does **not** claim that the department owns those items.

Shared Sheet: https://docs.google.com/spreadsheets/d/1wdj8ZT4GrZ3JfSa_SGzT1uOQO5_FAtmkFHXKi0Xbb2k/edit

## Install the app in the shared Sheet

1. Open the **Everett Alvarez Science Department Inventory** Google Sheet. In **Extensions → Apps Script**, replace the default `Code.gs` with the packaged `Code.gs`.
2. Add a new **Script** file named `Catalog` and paste `Catalog.gs`. Add an **HTML** file named `Index` and paste `Index.html`.
3. Save. Select the `getData` function and click **Run** once. Grant the required authorization. The script stores this Sheet's ID and checks the required tabs.
4. Select **Deploy → New deployment → Web app**. Choose **Execute as: Me** and limit **Who has access** to your school organization or a smaller authorized group. Deploy and share the web app URL with staff.
5. Add one real test item using the app, flag it for repair, resolve the request, then check it out and return it. Confirm the `Items`, `Issues`, `Loans`, and `Activity` tabs changed.

The standalone `Index.html` opens a **local demo** using sample data stored only in the browser. It is separate from the shared Google Sheet. A Google Sheet alone is **not** a deployed app; step 4 must be completed by someone with access to the school account.

To update a deployed app, replace the files in the same Apps Script project and select **Deploy → Manage deployments → Edit → New version → Deploy**. The backend automatically adds `Issues`, `Locations`, `Catalog`, and two condition-count columns when upgrading the first version of the app. Keep all original sheet headers and column order intact.

## Approved home locations

`409`, `410`, `411`, `412`, `400's Prep`, `200's Prep`, `201`, `203`, `204`, `209`, `211`.

The app requires a listed home location for every item and a listed destination for each checkout/use. Staff can add a cabinet or shelf separately. If locations change, edit the `Locations` Sheet tab; the app reads that list, while the CSV template and original example names remain examples.

## Catalog and stocktaking

The `Catalog` tab has **255 suggested equipment names, sizes, and types** for general science, AP Biology, and AP Chemistry. Search it in the app and choose **Add this item** to prefill an entry. Staff must then enter its real quantity and home room. One item type held in two rooms needs two inventory entries. Use custom names for materials outside the catalog. Standard sizes are practical choices to check during a stocktake, not evidence that each size is required for every course or already owned.

The app's **Whole department totals** page combines entries with the same standardized name, type, and counting unit across all locations. It shows the department's total owned, available, checked-out, repair, and replacement counts, with a room-by-room breakdown and a **+ Stock** action for each location. The Google Sheet has a live **Department Totals** tab with the same department-level count fields. Use the suggested names consistently: unrelated synonyms and misspellings can remain separate. Sizes are part of the name, so 250 mL and 400 mL beakers remain separate materials. The same SKU can appear in different rooms; it is unique within a room.

The app now recognizes differences in capitalization, word order, common singular/plural forms, and spacing/case around `mL` and `µL`. For example, `50Ml Beaker` and `Beaker 50mL` are stored as the same catalog name: **Beaker, low form borosilicate — 50 mL**. It also treats `0.05 L` as `50 mL`. The CSV preview shows the stored name before import. When an abbreviated name could refer to several catalog variants, such as a glass or plastic graduated cylinder, staff must choose the full type. Size and material descriptors are retained so distinct equipment is not merged. For names outside the catalog, matching word sets use the first existing name as the standard spelling.

New inventory records with a blank SKU receive an automatic `EAHS-000001` style identifier. Staff can also supply a SKU; new records at different locations receive distinct automatic identifiers.

Use **Reusable** for equipment expected back and **Consumable** for supplies used up. Count consistently in whole `each`, `packs`, `boxes`, or `bottles`; one entry should have one unit convention. Chemicals can be entered as consumables, but this general inventory is **not** a substitute for the school's chemical container and SDS management system.

## Condition and transaction rules

| Action | Total owned | Available to staff | Record created |
| --- | --- | --- | --- |
| Check out reusable units | Unchanged | Falls | Open loan; return restores availability |
| Use consumable units | Falls | Falls | Usage event, no return due |
| Flag for repair | Unchanged | Falls | Open repair request |
| Flag for replacement | Unchanged | Falls | Open replacement request |
| Resolve as Back in service | Unchanged | Rises | Closed or partially resolved request |
| Resolve as Removed from inventory | Falls | Unchanged | Closed or partially resolved request |

The available count equals total owned minus open checkouts, repair flags, and replacement flags. Requests include a staff member, affected quantity, and problem description. A request can be resolved in parts. If replacement stock arrives while a flagged item is discarded, resolve the flagged unit as **Back in service** only when its replacement is physically on hand; the total count remains constant. A replacement bought in addition to existing stock should be added with **Count**.

The `Activity` tab holds the full action history. The app displays the most recent 200 entries. The app serializes simultaneous writes with a script lock.

## CSV imports and exports

The app includes a downloadable CSV template. Required columns: `name`, `kind`, `quantity`, `location`. The type must be `Reusable` or `Consumable`, the quantity a whole number at least zero, and the location must match the approved list. Maximum 500 rows per batch. A standard import skips matching entries so retrying an inventory file does not double count. **New deliveries** is a separate checkbox: if explicitly selected, matching items in the same location receive the stated additional quantities. Reimporting the same delivery with this option selected adds it a second time. The receipt mode requires a staff member for its audit entry. Any invalid row rejects the batch, with row numbers for correction.

When a staff member adds an individual item that already matches an entry's name, type, and home location, the entered quantity is **added** to that entry's total. The app shows the resulting count. On the By room page, use **+ Stock** to add more to a known item; use **Count** to replace its total after a physical count. A differently named item, size, type, or location remains a separate entry.

Inventory CSV exports include checked-out, repair, and replacement counts for review. When importing an exported CSV, those status columns are **not imported as active transactions**. Rebuild actual open loans and repair requests through the app, or use the live Sheet as the continuing source of truth.

Only grant app access to staff authorized to alter inventory. This first version accepts typed staff names and does not impose separate administrator and teacher permissions. Back up the Sheet before bulk changes; Google Sheets version history provides recovery from accidental direct edits.

## Catalog reference

The suggested equipment families are informed by the American Chemical Society's [middle and high school laboratory equipment guidance](https://www.acs.org/education/policies/middle-and-high-school-chemistry/classroom-and-lab-facilities/safety-equipment.html), the College Board's [AP Biology lab manual](https://apcentral.collegeboard.org/media/pdf/ap-biology-teacher-lab-manual-effective-fall-2019.pdf), and the [AP Chemistry Course and Exam Description](https://apcentral.collegeboard.org/media/pdf/ap-chemistry-course-and-exam-description.pdf). The enumerated sizes are proposed stocktake labels; verify the sizes printed on your actual equipment before entering them.
