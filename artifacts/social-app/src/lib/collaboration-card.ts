export type LabeledField = { label: string; value: string };

export type CollaborationCardValues = {
  leadRole: string;
  supportRoles: string;
  bookingContact: string;
  who: string;
  where: string;
  references: string;
  concept: string;
  compensation: string;
  callTime: string;
  duration: string;
  emergencyContactOption: string;
  compensationType: string;
};

export const COLLABORATION_FIELD_LABELS = {
  leadRole: "Collab: Lead Role",
  supportRoles: "Collab: Support Roles",
  bookingContact: "Collab: Booking Contact",
  who: "Collab: Who",
  where: "Collab: Where",
  references: "Collab: References",
  concept: "Collab: Concept",
  compensation: "Collab: Compensation",
  callTime: "Collab: Call Time",
  duration: "Collab: Duration",
  emergencyContactOption: "Collab: Emergency Contact Option",
  compensationType: "Collab: Compensation Type",
} as const;

const COLLAB_LABEL_SET: Set<string> = new Set(Object.values(COLLABORATION_FIELD_LABELS));

export const EMPTY_COLLABORATION_CARD: CollaborationCardValues = {
  leadRole: "",
  supportRoles: "",
  bookingContact: "",
  who: "",
  where: "",
  references: "",
  concept: "",
  compensation: "",
  callTime: "",
  duration: "",
  emergencyContactOption: "",
  compensationType: "",
};

export function isCollaborationFieldLabel(label: string | null | undefined) {
  return !!label && COLLAB_LABEL_SET.has(label.trim());
}

export function extractCollaborationCard(fields: Array<LabeledField | null | undefined> | null | undefined): CollaborationCardValues {
  const values = { ...EMPTY_COLLABORATION_CARD };
  (fields || []).forEach((field) => {
    if (!field?.label) return;
    const label = field.label.trim();
    const value = field.value?.trim() || "";
    if (label === COLLABORATION_FIELD_LABELS.leadRole) values.leadRole = value;
    if (label === COLLABORATION_FIELD_LABELS.supportRoles) values.supportRoles = value;
    if (label === COLLABORATION_FIELD_LABELS.bookingContact) values.bookingContact = value;
    if (label === COLLABORATION_FIELD_LABELS.who) values.who = value;
    if (label === COLLABORATION_FIELD_LABELS.where) values.where = value;
    if (label === COLLABORATION_FIELD_LABELS.references) values.references = value;
    if (label === COLLABORATION_FIELD_LABELS.concept) values.concept = value;
    if (label === COLLABORATION_FIELD_LABELS.compensation) values.compensation = value;
    if (label === COLLABORATION_FIELD_LABELS.callTime) values.callTime = value;
    if (label === COLLABORATION_FIELD_LABELS.duration) values.duration = value;
    if (label === COLLABORATION_FIELD_LABELS.emergencyContactOption) values.emergencyContactOption = value;
    if (label === COLLABORATION_FIELD_LABELS.compensationType) values.compensationType = value;
  });
  return values;
}

export function applyCollaborationCard(fields: LabeledField[], next: CollaborationCardValues) {
  const preserved = fields.filter((field) => !isCollaborationFieldLabel(field.label));
  const merged = [...preserved];

  const entries: Array<[keyof CollaborationCardValues, string]> = [
    ["leadRole", COLLABORATION_FIELD_LABELS.leadRole],
    ["supportRoles", COLLABORATION_FIELD_LABELS.supportRoles],
    ["bookingContact", COLLABORATION_FIELD_LABELS.bookingContact],
    ["who", COLLABORATION_FIELD_LABELS.who],
    ["where", COLLABORATION_FIELD_LABELS.where],
    ["references", COLLABORATION_FIELD_LABELS.references],
    ["concept", COLLABORATION_FIELD_LABELS.concept],
    ["compensation", COLLABORATION_FIELD_LABELS.compensation],
    ["callTime", COLLABORATION_FIELD_LABELS.callTime],
    ["duration", COLLABORATION_FIELD_LABELS.duration],
    ["emergencyContactOption", COLLABORATION_FIELD_LABELS.emergencyContactOption],
    ["compensationType", COLLABORATION_FIELD_LABELS.compensationType],
  ];

  entries.forEach(([key, label]) => {
    const value = next[key].trim();
    if (value) merged.push({ label, value });
  });

  return merged;
}
