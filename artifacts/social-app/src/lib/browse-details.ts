import { isCollaborationFieldLabel } from "@/lib/collaboration-card";

export type LabeledField = { label: string; value: string };

export type BrowseDetailValues = {
  bestFor: string;
  travel: string;
  compensation: string;
  availabilityNote: string;
};

export const BROWSE_DETAIL_LABELS = {
  bestFor: "Browse: Best For",
  travel: "Browse: Travel",
  compensation: "Browse: Compensation",
  availabilityNote: "Browse: Availability Note",
} as const;

export const EMPTY_BROWSE_DETAILS: BrowseDetailValues = {
  bestFor: "",
  travel: "",
  compensation: "",
  availabilityNote: "",
};

const BROWSE_LABEL_SET: Set<string> = new Set(Object.values(BROWSE_DETAIL_LABELS));

export function isBrowseDetailLabel(label: string | null | undefined) {
  return !!label && BROWSE_LABEL_SET.has(label.trim());
}

export function parseCustomFieldsText(value: string) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return {
        label: label?.trim() || "Detail",
        value: rest.join("|").trim(),
      };
    })
    .filter((item) => item.label || item.value);
}

export function serializeCustomFieldsText(items: LabeledField[]) {
  return items
    .filter((item) => item.label?.trim() || item.value?.trim())
    .map((item) => [item.label?.trim() || "Detail", item.value?.trim()].filter(Boolean).join("|"))
    .join("\n");
}

export function extractBrowseDetails(fields: Array<LabeledField | null | undefined> | null | undefined): BrowseDetailValues {
  const details = { ...EMPTY_BROWSE_DETAILS };
  (fields || []).forEach((field) => {
    if (!field?.label) return;
    const label = field.label.trim();
    const value = field.value?.trim() || "";
    if (label === BROWSE_DETAIL_LABELS.bestFor) details.bestFor = value;
    if (label === BROWSE_DETAIL_LABELS.travel) details.travel = value;
    if (label === BROWSE_DETAIL_LABELS.compensation) details.compensation = value;
    if (label === BROWSE_DETAIL_LABELS.availabilityNote) details.availabilityNote = value;
  });
  return details;
}

export function applyBrowseDetails(fields: LabeledField[], browse: BrowseDetailValues) {
  const preserved = fields.filter((field) => !BROWSE_LABEL_SET.has(field.label.trim()));
  const next = [...preserved];

  if (browse.bestFor.trim()) next.push({ label: BROWSE_DETAIL_LABELS.bestFor, value: browse.bestFor.trim() });
  if (browse.travel.trim()) next.push({ label: BROWSE_DETAIL_LABELS.travel, value: browse.travel.trim() });
  if (browse.compensation.trim()) next.push({ label: BROWSE_DETAIL_LABELS.compensation, value: browse.compensation.trim() });
  if (browse.availabilityNote.trim()) next.push({ label: BROWSE_DETAIL_LABELS.availabilityNote, value: browse.availabilityNote.trim() });

  return next;
}

export function filterPublicCustomFields(fields: Array<LabeledField | null | undefined> | null | undefined) {
  return (fields || []).filter((field): field is LabeledField => {
    if (!field?.label || !field?.value) return false;
    return !isBrowseDetailLabel(field.label) && !isCollaborationFieldLabel(field.label);
  });
}

export function summarizeBrowseDetails(fields: Array<LabeledField | null | undefined> | null | undefined) {
  const details = extractBrowseDetails(fields);
  return [
    details.bestFor ? { label: "Best for", value: details.bestFor } : null,
    details.travel ? { label: "Travel", value: details.travel } : null,
    details.compensation ? { label: "Compensation", value: details.compensation } : null,
    details.availabilityNote ? { label: "Availability note", value: details.availabilityNote } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}
