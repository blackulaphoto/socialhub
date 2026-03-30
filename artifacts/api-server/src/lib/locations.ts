const REGION_TO_CODE: Record<string, string> = {
  alabama: "AL",
  arizona: "AZ",
  california: "CA",
  colorado: "CO",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  illinois: "IL",
  louisiana: "LA",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  missouri: "MO",
  nevada: "NV",
  "new york": "NY",
  oregon: "OR",
  pennsylvania: "PA",
  tennessee: "TN",
  texas: "TX",
  washington: "WA",
};

const CODE_TO_REGION = Object.fromEntries(
  Object.entries(REGION_TO_CODE).map(([region, code]) => [code, region]),
) as Record<string, string>;

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function expandLocationTerms(input?: string | null) {
  const raw = clean(input || "");
  if (!raw) return [];

  const terms = new Set<string>();
  const push = (value?: string | null) => {
    const normalized = clean(value || "");
    if (normalized) terms.add(normalized);
  };

  push(raw);

  const parts = raw.split(",").map((part) => clean(part)).filter(Boolean);
  const city = parts[0] || "";
  const region = parts.slice(1).join(", ");

  if (city) push(city);

  if (region) {
    push(region);
    const lowerRegion = region.toLowerCase();
    const regionCode = REGION_TO_CODE[lowerRegion] || (REGION_TO_CODE[lowerRegion.replace(/\./g, "")] ?? "");
    if (regionCode) {
      push(regionCode);
      push(`${city}, ${regionCode}`);
      push(`${city}, ${titleCase(CODE_TO_REGION[regionCode])}`);
    } else {
      const upperRegion = region.toUpperCase();
      const regionName = CODE_TO_REGION[upperRegion];
      if (regionName) {
        push(upperRegion);
        push(titleCase(regionName));
        push(`${city}, ${upperRegion}`);
        push(`${city}, ${titleCase(regionName)}`);
      }
    }
  } else {
    const lowerRaw = raw.toLowerCase();
    const maybeCode = REGION_TO_CODE[lowerRaw];
    if (maybeCode) push(maybeCode);
    const maybeRegion = CODE_TO_REGION[raw.toUpperCase()];
    if (maybeRegion) push(titleCase(maybeRegion));
  }

  return Array.from(terms);
}
