import { db, eq, siteSettings } from "@workspace/db";

export type SiteBrandingValue = Record<string, unknown>;

type SettingRow = {
  id: string;
  key: string;
  category: string | null;
  value: unknown;
  createdAt: Date | null;
};

const asRecord = (value: unknown): SiteBrandingValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as SiteBrandingValue)
    : {};

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const newestFirst = (rows: SettingRow[]) =>
  [...rows].sort((left, right) => {
    const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : 0;
    const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : 0;
    return rightTime - leftTime;
  });

const preferredRow = (rows: SettingRow[]) => {
  const ordered = newestFirst(rows);
  return ordered.find((row) => row.category === "general") ?? ordered[0] ?? null;
};

async function readRowsByKey(key: string): Promise<SettingRow[]> {
  return (await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))) as SettingRow[];
}

function legacyString(rows: SettingRow[]): string | null {
  const row = preferredRow(rows);
  return nonEmptyString(row?.value);
}

/**
 * Read the canonical JSON branding row without depending on its category.
 * Older installations may store logo_url/favicon_url as separate setting rows;
 * these are used only when the canonical branding object has no such property.
 */
export async function readSiteBranding(): Promise<SiteBrandingValue> {
  const [brandingRows, legacyLogoRows, legacyFaviconRows] = await Promise.all([
    readRowsByKey("branding"),
    readRowsByKey("logo_url"),
    readRowsByKey("favicon_url"),
  ]);
  const row = preferredRow(brandingRows);
  const branding = asRecord(row?.value);

  if (!Object.prototype.hasOwnProperty.call(branding, "logo_url")) {
    const legacyLogo = legacyString(legacyLogoRows);
    if (legacyLogo) branding.logo_url = legacyLogo;
  }
  if (!Object.prototype.hasOwnProperty.call(branding, "favicon_url")) {
    const legacyFavicon = legacyString(legacyFaviconRows);
    if (legacyFavicon) branding.favicon_url = legacyFavicon;
  }

  return branding;
}

/** Persist the icon setting while preserving all other branding properties. */
export async function saveSiteFaviconUrl(faviconUrl: string): Promise<SiteBrandingValue> {
  const [existingRows, currentBranding] = await Promise.all([
    readRowsByKey("branding"),
    readSiteBranding(),
  ]);
  const value = { ...currentBranding, favicon_url: faviconUrl };
  const primary = preferredRow(existingRows);

  if (primary) {
    // Prefer a stable primary record instead of updating by key, which could
    // overwrite other duplicate rows with conflicting legacy branding data.
    await db
      .update(siteSettings)
      .set({ category: "general", value })
      .where(eq(siteSettings.id, primary.id));
  } else {
    await db.insert(siteSettings).values({
      id: crypto.randomUUID(),
      key: "branding",
      category: "general",
      value,
      createdAt: new Date(),
    });
  }

  return value;
}
