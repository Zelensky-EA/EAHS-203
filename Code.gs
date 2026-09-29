/** Science department inventory — bound to a Google Sheet. */
const TABLES = {
  Items: ['id','sku','name','category','kind','quantity','checkedOut','unit','location','storage','minStock','manufacturer','catalogNumber','hazard','expiration','notes','updatedAt','needsRepair','needsReplacement'],
  Loans: ['id','itemId','quantity','remaining','borrower','destination','checkedOutAt','dueDate','returnedAt','status','notes'],
  Activity: ['id','timestamp','action','itemId','itemName','quantity','actor','details'],
  Issues: ['id','itemId','type','quantity','remaining','reportedBy','details','reportedAt','status','resolvedBy','resolution','resolvedAt'],
  Locations: ['location'],
  Catalog: ['category','name','kind','unit','courses','notes']
};
const ROOM_OPTIONS = ['409','410','411','412',"400's Prep","200's Prep",'201','203','204','209','211'];

function doGet() {
  setup_();
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Science Inventory');
}

function book_() {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty('INVENTORY_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Open the project from the inventory Sheet and run getData once to connect it.');
  properties.setProperty('INVENTORY_SHEET_ID', active.getId());
  return active;
}
function setup_() {
  const book = book_();
  Object.keys(TABLES).forEach(name => {
    let sheet = book.getSheetByName(name);
    if (!sheet) sheet = book.insertSheet(name);
    const headers = TABLES[name];
    // Safe migration for the initial app: add the two condition-count columns.
    if (name === 'Items' && sheet.getLastRow() > 0) {
      const prior = headers.slice(0, 17);
      if (sheet.getRange(1, 1, 1, prior.length).getValues()[0].join('|') === prior.join('|') && sheet.getRange(1, 18).getValue() === '') {
        sheet.getRange(1, 18, 1, 2).setValues([['needsRepair','needsReplacement']]);
      }
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#123257').setFontColor('#ffffff');
      sheet.autoResizeColumns(1, headers.length);
    } else if (sheet.getRange(1, 1, 1, headers.length).getValues()[0].join('|') !== headers.join('|')) {
      throw new Error('The ' + name + ' sheet headers have changed. Restore the original column order before continuing.');
    }
    if (sheet.getLastRow() === 1 && name === 'Locations') sheet.getRange(2, 1, ROOM_OPTIONS.length, 1).setValues(ROOM_OPTIONS.map(x => [x]));
    if (sheet.getLastRow() === 1 && name === 'Catalog') sheet.getRange(2, 1, CATALOG_ROWS.length, headers.length).setValues(CATALOG_ROWS);
  });
}

function sheet_(name) { return book_().getSheetByName(name); }
function rows_(name) {
  const sh = sheet_(name), count = sh.getLastRow() - 1;
  if (count < 1) return [];
  return sh.getRange(2, 1, count, TABLES[name].length).getValues().map((values, index) => {
    const row = { _row: index + 2 };
    TABLES[name].forEach((key, i) => row[key] = values[i] instanceof Date ? Utilities.formatDate(values[i], Session.getScriptTimeZone(), 'yyyy-MM-dd') : values[i]);
    return row;
  });
}
function clean_(value, length) {
  return String(value == null ? '' : value).trim().slice(0, length || 500).replace(/[\u0000-\u001f]/g, ' ');
}
// Google Sheets interprets user-entered leading formula characters. Keep them literal.
function safe_(value, length) {
  const s = clean_(value, length);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
function positive_(n, label, allowZero) {
  if (n === '' || n === null || n === undefined) throw new Error(label + ' is required.');
  const value = Number(n);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error(label + ' must be a ' + (allowZero ? 'nonnegative' : 'positive') + ' whole number.');
  return value;
}
function log_(action, item, quantity, actor, details) {
  append_('Activity', {id: Utilities.getUuid(), timestamp: new Date().toISOString(), action, itemId: item.id, itemName: item.name, quantity, actor: safe_(actor, 100), details: safe_(details, 500)});
}
function append_(name, obj) { sheet_(name).appendRow(TABLES[name].map(k => obj[k] == null ? '' : obj[k])); }
function write_(name, obj) { sheet_(name).getRange(obj._row, 1, 1, TABLES[name].length).setValues([TABLES[name].map(k => obj[k] == null ? '' : obj[k])]); }
function locked_(fn) {
  setup_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Inventory is busy. Try again in a moment.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function getData() {
  setup_();
  const strip = row => { const obj = Object.assign({}, row); delete obj._row; return obj; };
  return {items: rows_('Items').map(strip), loans: rows_('Loans').filter(x => x.status === 'Open').map(strip), issues: rows_('Issues').filter(x => x.status === 'Open').map(strip), activity: rows_('Activity').slice(-200).reverse().map(strip), locations: rows_('Locations').map(x => x.location).filter(Boolean), catalog: rows_('Catalog').map(strip)};
}
function unavailable_(item) { return Number(item.checkedOut) + Number(item.needsRepair || 0) + Number(item.needsReplacement || 0); }
function nextAutoSku_(usedSkus) {
  const used = usedSkus || new Set(rows_('Items').filter(x => x.sku).map(x => String(x.sku).toUpperCase()));
  let highest = 0;
  used.forEach(sku => {
    const match = String(sku).match(/^EAHS-(\d+)$/i);
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  let number = highest + 1;
  let sku = 'EAHS-' + String(number).padStart(6, '0');
  while (used.has(sku.toUpperCase())) { number += 1; sku = 'EAHS-' + String(number).padStart(6, '0'); }
  used.add(sku.toUpperCase());
  return sku;
}
function nameSignature_(value) {
  const text = clean_(value, 160).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:milliliters?|millilitres?|ml)\b/g, (_, amount) => Number(amount) + 'ml')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:microliters?|microlitres?|µl|μl|ul)\b/g, (_, amount) => Number(amount) + 'ul')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:liters?|litres?|l)\b/g, (_, amount) => Number(amount) * 1000 + 'ml')
    .replace(/×/g, 'x');
  const singular = {beakers:'beaker', flasks:'flask', cylinders:'cylinder', pipettes:'pipette', pipets:'pipet', tubes:'tube', dishes:'dish', bottles:'bottle', microscopes:'microscope'};
  return text.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(word => singular[word] || word).sort().join('|');
}
function catalogAlias_(name) {
  const parts = name.split(' — ');
  return parts[0].split(',')[0] + (parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '');
}
function canonicalName_(rawName, kind, unit, existing) {
  const key = nameSignature_(rawName);
  const exact = CATALOG_ROWS.filter(row => nameSignature_(row[1]) === key && row[2] === kind && row[3].toLowerCase() === unit.toLowerCase());
  if (exact.length === 1) return exact[0][1];
  const aliases = CATALOG_ROWS.filter(row => nameSignature_(catalogAlias_(row[1])) === key && row[2] === kind && row[3].toLowerCase() === unit.toLowerCase());
  if (aliases.length === 1) return aliases[0][1];
  const known = (existing || []).find(item => nameSignature_(item.name) === key && item.kind === kind && String(item.unit).toLowerCase() === unit.toLowerCase());
  if (known) return known.name;
  if (aliases.length > 1) throw new Error('Several catalog variants match this name. Choose the full name specifying material or type: ' + aliases.slice(0, 3).map(x => x[1]).join('; '));
  return rawName.replace(/\b(\d+(?:\.\d+)?)\s*ml\b/gi, '$1 mL').replace(/\b(\d+(?:\.\d+)?)\s*(?:µl|μl|ul)\b/gi, '$1 µL');
}
function itemKey_(item) { return nameSignature_(item.name) + '|' + clean_(item.location).toLowerCase() + '|' + clean_(item.kind).toLowerCase(); }
function sameStock_(existing, incoming) {
  if (existing.unit.toLowerCase() !== incoming.unit.toLowerCase()) throw new Error('Matching item has a different counting unit. Use its existing unit or give this material a distinct name.');
  if (existing.sku && incoming.sku && existing.sku.toLowerCase() !== incoming.sku.toLowerCase()) throw new Error('Matching item has a different SKU. Use Add stock on the correct entry or distinguish the item names.');
  if (existing.catalogNumber && incoming.catalogNumber && existing.catalogNumber.toLowerCase() !== incoming.catalogNumber.toLowerCase()) throw new Error('Matching item has a different catalog number. Check which entry should receive these units.');
}
function itemInput_(raw, previous, allowedRooms, knownItems) {
  const rawName = safe_(raw.name, 160), location = safe_(raw.location, 100);
  const kind = clean_(raw.kind, 20), unit = safe_(raw.unit, 40) || 'each';
  const name = rawName ? canonicalName_(rawName, kind, unit, knownItems) : '';
  if (!name || !location) throw new Error('Item name and home classroom or prep area are required.');
  if (!(allowedRooms || new Set(rows_('Locations').map(x => x.location))).has(location)) throw new Error('Select a listed classroom or prep area.');
  if (!['Reusable','Consumable'].includes(kind)) throw new Error('Select Reusable or Consumable.');
  const quantity = positive_(raw.quantity, 'Quantity', true);
  if (previous && quantity < unavailable_(previous)) throw new Error('Quantity cannot be less than checked out or flagged units.');
  const expiration = clean_(raw.expiration, 10);
  if (expiration && !/^\d{4}-\d{2}-\d{2}$/.test(expiration)) throw new Error('Use YYYY-MM-DD for expiration.');
  return {
    id: previous ? previous.id : Utilities.getUuid(), sku: safe_(raw.sku, 80), name,
    category: safe_(raw.category, 80) || 'Other', kind, quantity,
    checkedOut: previous ? Number(previous.checkedOut) : 0,
    unit, location, storage: safe_(raw.storage, 120),
    minStock: positive_(raw.minStock === '' || raw.minStock == null ? 0 : raw.minStock, 'Reorder level', true),
    manufacturer: safe_(raw.manufacturer, 120), catalogNumber: safe_(raw.catalogNumber, 100),
    hazard: safe_(raw.hazard, 120), expiration, notes: safe_(raw.notes, 500), updatedAt: new Date().toISOString(),
    needsRepair: previous ? Number(previous.needsRepair || 0) : 0,
    needsReplacement: previous ? Number(previous.needsReplacement || 0) : 0
  };
}
function saveItem(raw) {
  return locked_(() => {
    const existing = rows_('Items');
    const usedSkus = new Set(existing.filter(x => x.sku).map(x => String(x.sku).toUpperCase()));
    const old = raw.id ? existing.find(x => x.id === raw.id) : null;
    if (raw.id && !old) throw new Error('This item no longer exists. Refresh the inventory.');
    const item = itemInput_(raw, old, null, existing);
    if (old && old.kind !== item.kind && Number(old.checkedOut) > 0) throw new Error('Return outstanding loans before changing item type.');
    if (old && existing.some(x => x.id !== old.id && itemKey_(x) === itemKey_(item))) throw new Error('An entry for this item already exists in that location. Use Add stock on the existing entry.');
    const match = old ? null : existing.find(x => itemKey_(x) === itemKey_(item));
    if (match) {
      sameStock_(match, item);
      if (item.sku && existing.some(x => x.id !== match.id && x.location === item.location && x.sku && x.sku.toLowerCase() === item.sku.toLowerCase())) throw new Error('This SKU belongs to another inventory entry in this room.');
      const received = positive_(item.quantity, 'Additional quantity');
      if (!match.sku) match.sku = nextAutoSku_(usedSkus);
      match.quantity = Number(match.quantity) + received;
      match.updatedAt = new Date().toISOString(); write_('Items', match);
      log_('RESTOCK', match, received, raw.actor || '', 'Matching item in ' + match.location + '; new total ' + match.quantity);
      const result = getData(); result._message = 'Added ' + received + ' ' + match.unit + ' to ' + match.name + ' in ' + match.location + '. New total: ' + match.quantity + '.';
      return result;
    }
    if (item.sku && existing.some(x => x.location === item.location && x.sku && x.sku.toLowerCase() === item.sku.toLowerCase() && x.id !== item.id)) throw new Error('This SKU belongs to another entry in this room. Use Add stock on that entry.');
    if (!item.sku) item.sku = old && old.sku ? old.sku : nextAutoSku_(usedSkus);
    if (old) { item._row = old._row; write_('Items', item); }
    else append_('Items', item);
    log_(old ? 'EDIT' : 'ADD', item, item.quantity, raw.actor || '', old ? 'Item details updated' : 'New item');
    return getData();
  });
}
function receiveStock(raw) {
  return locked_(() => {
    const item = rows_('Items').find(x => x.id === raw.itemId);
    if (!item) throw new Error('Inventory item not found. Refresh the page.');
    const quantity = positive_(raw.quantity, 'Quantity received');
    const by = safe_(raw.actor, 100);
    if (!by) throw new Error('Enter the staff member receiving the stock.');
    item.quantity = Number(item.quantity) + quantity;
    item.updatedAt = new Date().toISOString(); write_('Items', item);
    log_('RESTOCK', item, quantity, by, 'New total ' + item.quantity + (raw.notes ? '; ' + clean_(raw.notes, 250) : ''));
    const result = getData(); result._message = 'Added ' + quantity + ' ' + item.unit + ' to ' + item.name + ' in ' + item.location + '. New total: ' + item.quantity + '.';
    return result;
  });
}
function importItems(rawItems, actor, addToExisting) {
  if (!Array.isArray(rawItems) || rawItems.length > 500) throw new Error('Import up to 500 rows at a time.');
  return locked_(() => {
    if (addToExisting && !safe_(actor, 100)) throw new Error('Enter the staff member receiving stock before importing.');
    const existing = rows_('Items');
    const usedSkus = new Set(existing.filter(x => x.sku).map(x => String(x.sku).toUpperCase()));
    const allowedRooms = new Set(rows_('Locations').map(x => x.location));
    const skuKey = x => x.sku.toLowerCase() + '|' + x.location;
    const bySku = new Map(existing.filter(x => x.sku).map(x => [skuKey(x), x]));
    const byKey = new Map(existing.map(x => [itemKey_(x), x]));
    const prepared = [], increments = new Map(), errors = [], skipped = [];
    rawItems.forEach((raw, i) => {
      try {
        const item = itemInput_(raw, null, allowedRooms, existing.concat(prepared));
        const sameName = byKey.get(itemKey_(item));
        const sameSku = item.sku && bySku.get(skuKey(item));
        if (sameSku && sameName && sameSku.id !== sameName.id) throw new Error('SKU and item name point to different records.');
        if (sameSku && itemKey_(sameSku) !== itemKey_(item)) {
          if (addToExisting) throw new Error('SKU belongs to another item or home location.');
          skipped.push(i + 2); return;
        }
        const match = sameName || sameSku;
        if (match) {
          if (!addToExisting) { skipped.push(i + 2); return; }
          sameStock_(match, item);
          const amount = positive_(item.quantity, 'Additional quantity');
          if (match._row) increments.set(match.id, {item: match, quantity: (increments.get(match.id)?.quantity || 0) + amount});
          else match.quantity = Number(match.quantity) + amount; // Merge repeated new entries inside this same CSV.
          return;
        }
        if (!item.sku) item.sku = nextAutoSku_(usedSkus);
        else usedSkus.add(item.sku.toUpperCase());
        byKey.set(itemKey_(item), item);
        if (item.sku) bySku.set(skuKey(item), item);
        prepared.push(item);
      } catch (e) { errors.push('CSV row ' + (i + 2) + ': ' + e.message); }
    });
    if (errors.length) throw new Error('No rows imported. ' + errors.slice(0, 8).join(' ') + (errors.length > 8 ? ' (and ' + (errors.length - 8) + ' more)' : ''));
    increments.forEach(({item, quantity}) => {
      item.quantity = Number(item.quantity) + quantity;
      item.updatedAt = new Date().toISOString(); write_('Items', item);
      log_('RESTOCK', item, quantity, actor, 'CSV stock receipt; new total ' + item.quantity);
    });
    if (prepared.length) {
      sheet_('Items').getRange(sheet_('Items').getLastRow() + 1, 1, prepared.length, TABLES.Items.length).setValues(prepared.map(x => TABLES.Items.map(k => x[k] == null ? '' : x[k])));
      const activity = prepared.map(item => [Utilities.getUuid(), new Date().toISOString(), 'IMPORT', item.id, item.name, item.quantity, safe_(actor, 100), 'CSV import']);
      sheet_('Activity').getRange(sheet_('Activity').getLastRow() + 1, 1, activity.length, TABLES.Activity.length).setValues(activity);
    }
    return {added: prepared.length, restocked: increments.size, skipped: skipped.length, skippedRows: skipped, data: getData()};
  });
}
function checkout(raw) {
  return locked_(() => {
    const item = rows_('Items').find(x => x.id === raw.itemId);
    if (!item) throw new Error('Item not found. Refresh the inventory.');
    const quantity = positive_(raw.quantity, 'Quantity');
    if (quantity > Number(item.quantity) - unavailable_(item)) throw new Error('Only ' + (Number(item.quantity) - unavailable_(item)) + ' ' + item.unit + ' available.');
    const borrower = safe_(raw.borrower, 100), destination = safe_(raw.destination, 100);
    if (!borrower || !destination) throw new Error('Staff member and destination are required.');
    if (!rows_('Locations').some(x => x.location === destination)) throw new Error('Choose a listed destination.');
    const dueDate = clean_(raw.dueDate, 10);
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Use YYYY-MM-DD for due date.');
    if (item.kind === 'Reusable') {
      item.checkedOut = Number(item.checkedOut) + quantity;
      append_('Loans', {id: Utilities.getUuid(), itemId: item.id, quantity, remaining: quantity, borrower, destination, checkedOutAt: new Date().toISOString(), dueDate, returnedAt: '', status: 'Open', notes: safe_(raw.notes, 300)});
      log_('CHECK OUT', item, quantity, borrower, 'To ' + destination + (dueDate ? '; due ' + dueDate : ''));
    } else {
      item.quantity = Number(item.quantity) - quantity;
      log_('USE', item, quantity, borrower, 'Used in ' + destination + (raw.notes ? '; ' + raw.notes : ''));
    }
    item.updatedAt = new Date().toISOString(); write_('Items', item);
    return getData();
  });
}
function returnLoan(raw) {
  return locked_(() => {
    const loan = rows_('Loans').find(x => x.id === raw.loanId && x.status === 'Open');
    if (!loan) throw new Error('Checkout already closed or not found. Refresh the page.');
    const quantity = positive_(raw.quantity, 'Return quantity');
    if (quantity > Number(loan.remaining)) throw new Error('Only ' + loan.remaining + ' still checked out.');
    const item = rows_('Items').find(x => x.id === loan.itemId);
    if (!item) throw new Error('Inventory item for this checkout is missing.');
    loan.remaining = Number(loan.remaining) - quantity;
    if (loan.remaining === 0) { loan.status = 'Returned'; loan.returnedAt = new Date().toISOString(); }
    item.checkedOut = Number(item.checkedOut) - quantity;
    item.updatedAt = new Date().toISOString();
    write_('Loans', loan); write_('Items', item);
    log_('RETURN', item, quantity, raw.actor || loan.borrower, 'From ' + loan.destination + (raw.notes ? '; ' + raw.notes : ''));
    return getData();
  });
}
function adjustStock(raw) {
  return locked_(() => {
    const item = rows_('Items').find(x => x.id === raw.itemId);
    if (!item) throw new Error('Item not found. Refresh the page.');
    const next = positive_(raw.quantity, 'New total quantity', true);
    if (next < unavailable_(item)) throw new Error('New total cannot be below checked out or flagged quantities.');
    const old = Number(item.quantity);
    item.quantity = next; item.updatedAt = new Date().toISOString(); write_('Items', item);
    log_('COUNT', item, next - old, raw.actor || '', 'Count corrected from ' + old + ' to ' + next + '; ' + clean_(raw.reason, 250));
    return getData();
  });
}
function reportIssue(raw) {
  return locked_(() => {
    const item = rows_('Items').find(x => x.id === raw.itemId);
    if (!item) throw new Error('Item not found. Refresh the page.');
    const type = clean_(raw.type, 20);
    if (!['Repair','Replacement'].includes(type)) throw new Error('Select repair or replacement.');
    const quantity = positive_(raw.quantity, 'Affected quantity');
    if (quantity > Number(item.quantity) - unavailable_(item)) throw new Error('Only available units can be flagged. Return checked-out units first.');
    const by = safe_(raw.reportedBy, 100), details = safe_(raw.details, 500);
    if (!by || !details) throw new Error('Staff member and description are required.');
    append_('Issues', {id: Utilities.getUuid(), itemId: item.id, type, quantity, remaining: quantity, reportedBy: by, details, reportedAt: new Date().toISOString(), status: 'Open'});
    const field = type === 'Repair' ? 'needsRepair' : 'needsReplacement';
    item[field] = Number(item[field] || 0) + quantity;
    item.updatedAt = new Date().toISOString(); write_('Items', item);
    log_(type.toUpperCase() + ' NEEDED', item, quantity, by, details);
    return getData();
  });
}
function resolveIssue(raw) {
  return locked_(() => {
    const issue = rows_('Issues').find(x => x.id === raw.issueId && x.status === 'Open');
    if (!issue) throw new Error('Request already closed or not found. Refresh the page.');
    const item = rows_('Items').find(x => x.id === issue.itemId);
    if (!item) throw new Error('Inventory item for this request is missing.');
    const quantity = positive_(raw.quantity, 'Resolution quantity');
    if (quantity > Number(issue.remaining)) throw new Error('Only ' + issue.remaining + ' unit(s) remain flagged.');
    const resolution = clean_(raw.resolution, 30);
    if (!['Back in service','Removed from inventory'].includes(resolution)) throw new Error('Select how the request was resolved.');
    const by = safe_(raw.resolvedBy, 100);
    if (!by) throw new Error('Staff member is required.');
    const field = issue.type === 'Repair' ? 'needsRepair' : 'needsReplacement';
    item[field] = Number(item[field] || 0) - quantity;
    if (resolution === 'Removed from inventory') item.quantity = Number(item.quantity) - quantity;
    issue.remaining = Number(issue.remaining) - quantity;
    if (issue.remaining === 0) { issue.status = 'Resolved'; issue.resolvedAt = new Date().toISOString(); }
    issue.resolvedBy = by; issue.resolution = resolution;
    item.updatedAt = new Date().toISOString(); write_('Issues', issue); write_('Items', item);
    log_('ISSUE RESOLVED', item, quantity, by, resolution + (raw.notes ? '; ' + clean_(raw.notes, 250) : ''));
    return getData();
  });
}
