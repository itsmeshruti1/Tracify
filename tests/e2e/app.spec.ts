import { test, expect, type Page } from '@playwright/test';
import { createSampleIncidents } from '../../src/data/sampleData';
import { exportCsv } from '../../src/lib/csv';

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; runtimeErrors.set(page, errors); page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Collision density explorer' })).toBeVisible();
  await expect(page).toHaveTitle('Tracify — Road Safety Analytics');
});
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]); });
test('explorer renders and clustering responds to parameters, theme and filters', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('.metrics')).toContainText('16');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 10000 }).catch(() => undefined);
  await page.screenshot({ path: `docs/screenshots/explorer-${info.project.name}.png`, fullPage: true, scale: 'css', animations: 'disabled' });
  await page.getByText('Minimum incidents', { exact: false }).locator('input').fill('15');
  await expect(page.locator('.metrics').nth(0)).toContainText('4');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('textbox', { name: 'Search incidents' }).fill('nothing matches this');
  await expect(page.getByText('No clusters match these filters.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
test('report with evidence persists once across reload, appears in filters, and can be deleted', async ({ page }) => {
  await page.getByRole('button', { name: 'Report incident' }).click();
  const dialog = page.getByRole('dialog', { name: 'Report an incident' });
  await dialog.getByLabel('Location name', { exact: true }).fill('Persistence test junction');
  await dialog.getByLabel('Description').fill('Browser persistence test');
  await dialog.getByLabel('Optional evidence', { exact: false }).setInputFiles({ name: 'evidence.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64') });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await dialog.getByRole('checkbox').scrollIntoViewIfNeeded();
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Save report', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Incident register' }).click();
  // New reports occur after the fixed sample snapshot: select the full current period explicitly.
  await page.getByLabel('To (IST)', { exact: true }).fill(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
  await page.getByRole('textbox', { name: 'Search incidents' }).fill('Persistence test junction');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Details', exact: false }).click();
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /^Delete / }).click(); await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});
test('CSV import previews, skips duplicates and exports matching rows', async ({ page }) => {
  await page.getByRole('button', { name: 'Incident register' }).click();
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const p = { ...createSampleIncidents()[1], id: 'import-test', locationName: 'CSV integration junction', description: 'quoted, field\nsecond line' };
  await page.getByLabel('CSV file').setInputFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(exportCsv([p])) });
  await expect(page.getByText('1 valid rows', { exact: false })).toBeVisible();
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Import 1 incidents' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Search incidents' }).fill('CSV integration');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export view' }).click();
  expect((await download).suggestedFilename()).toBe('tracify-incidents.csv');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.getByLabel('CSV file').setInputFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(exportCsv([p])) });
  await expect(page.getByText('1 existing IDs skipped', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import 0 incidents' })).toBeDisabled();
});
test('all views work on the viewport and no cloud configuration is required', async ({ page }) => {
  await page.getByRole('button', { name: 'Temporal insights' }).click();
  await expect(page.getByRole('heading', { name: 'When incidents were recorded' })).toBeVisible();
  await page.getByText('Travel speed', { exact: false }).locator('input').fill('80');
  await expect(page.locator('.stopping-results')).toContainText('Dry asphalt');
  await page.getByRole('button', { name: 'Data & methodology' }).click();
  await expect(page.getByRole('heading', { name: 'Know what you are looking at.' })).toBeVisible();
  await page.getByRole('button', { name: 'Private cloud', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your private incident workspace' })).toBeVisible();
  await page.getByRole('button', { name: 'Use local demo' }).click();
  await expect(page.getByRole('heading', { name: 'Know what you are looking at.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
test('dialogs support Escape and keyboard focus stays within modal', async ({ page }) => {
  await page.getByRole('button', { name: 'Report incident' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
});
