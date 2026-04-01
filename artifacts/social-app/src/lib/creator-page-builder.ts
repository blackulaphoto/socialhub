export const CREATOR_BUILDER_META_KEY = "__builder";

export const CREATOR_SECTION_KEYS = [
  "featured",
  "gallery",
  "video",
  "audio",
  "links",
  "events",
  "about",
  "posts",
  "contact",
] as const;

export type CreatorSectionKey = (typeof CREATOR_SECTION_KEYS)[number];

export type CreatorBuilderSection = {
  key: CreatorSectionKey;
  visible: boolean;
};

export type CreatorBuilderMeta = {
  version: 2;
  heroVideoUrl?: string;
  heroMediaType?: "image" | "video";
  heroItemIds?: number[];
  galleryItemIds?: number[];
  videoItemIds?: number[];
  sections: CreatorBuilderSection[];
};

type LegacyInputs = {
  enabledModules?: string[] | null;
  moduleOrder?: string[] | null;
  featuredType?: string | null;
  featuredUrl?: string | null;
  linkCount?: number;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasAudio?: boolean;
};

function createDefaultSections(input: LegacyInputs): CreatorBuilderSection[] {
  const enabledModules = input.enabledModules || [];
  const moduleOrder = input.moduleOrder?.length ? input.moduleOrder : ["featured", "about", "media", "posts", "events", "contact"];
  const visibleByKey: Record<CreatorSectionKey, boolean> = {
    featured: enabledModules.includes("featured"),
    gallery: enabledModules.includes("media"),
    video: enabledModules.includes("media") && (Boolean(input.hasVideos) || input.featuredType === "video"),
    audio: enabledModules.includes("media") && (Boolean(input.hasAudio) || input.featuredType === "track"),
    links: Boolean(input.linkCount),
    events: enabledModules.includes("events"),
    about: enabledModules.includes("about"),
    posts: enabledModules.includes("posts"),
    contact: enabledModules.includes("contact"),
  };

  const expandModule = (module: string): CreatorSectionKey[] => {
    if (module === "media") {
      return ["gallery", "video", "audio"];
    }
    if (module === "featured" || module === "events" || module === "about" || module === "posts" || module === "contact") {
      return [module];
    }
    return [];
  };

  const orderedKeys = moduleOrder.flatMap(expandModule);
  const seen = new Set<string>();
  const normalized = [...orderedKeys, ...CREATOR_SECTION_KEYS].filter((key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as CreatorSectionKey[];

  return normalized.map((key) => ({
    key,
    visible: visibleByKey[key],
  }));
}

export function readCreatorBuilderMeta(
  sectionConfigs: Record<string, unknown> | null | undefined,
  input: LegacyInputs,
): CreatorBuilderMeta {
  const rawMeta = sectionConfigs?.[CREATOR_BUILDER_META_KEY];
  if (rawMeta && typeof rawMeta === "object") {
    const meta = rawMeta as Partial<CreatorBuilderMeta>;
    if (Array.isArray(meta.sections)) {
      const validSections = meta.sections
        .filter((section): section is CreatorBuilderSection =>
          Boolean(section)
          && typeof section === "object"
          && typeof section.key === "string"
          && CREATOR_SECTION_KEYS.includes(section.key as CreatorSectionKey)
          && typeof section.visible === "boolean",
        );

      if (validSections.length) {
        const seen = new Set<CreatorSectionKey>();
        const sections = [...validSections, ...CREATOR_SECTION_KEYS.map((key) => ({ key, visible: false }))]
          .filter((section) => {
            if (seen.has(section.key)) return false;
            seen.add(section.key);
            return true;
          });

        return {
          version: 2,
          heroVideoUrl: typeof meta.heroVideoUrl === "string" ? meta.heroVideoUrl : "",
          heroMediaType: meta.heroMediaType === "video" ? "video" : "image",
          heroItemIds: Array.isArray(meta.heroItemIds) ? meta.heroItemIds.map(Number).filter(Number.isFinite) : [],
          galleryItemIds: Array.isArray(meta.galleryItemIds) ? meta.galleryItemIds.map(Number).filter(Number.isFinite) : [],
          videoItemIds: Array.isArray(meta.videoItemIds) ? meta.videoItemIds.map(Number).filter(Number.isFinite) : [],
          sections,
        };
      }
    }
  }

  return {
    version: 2,
    heroVideoUrl: "",
    heroMediaType: "image",
    heroItemIds: [],
    galleryItemIds: [],
    videoItemIds: [],
    sections: createDefaultSections(input),
  };
}

export function writeCreatorBuilderMeta(
  sectionConfigs: Record<string, unknown> | null | undefined,
  meta: CreatorBuilderMeta,
) {
  return {
    ...(sectionConfigs || {}),
    [CREATOR_BUILDER_META_KEY]: meta,
  };
}

export function deriveLegacyModuleState(sections: CreatorBuilderSection[]) {
  const visibleSections = sections.filter((section) => section.visible);
  const enabledModules = new Set<string>();

  visibleSections.forEach((section) => {
    if (section.key === "featured") enabledModules.add("featured");
    if (section.key === "gallery" || section.key === "video" || section.key === "audio") enabledModules.add("media");
    if (section.key === "events") enabledModules.add("events");
    if (section.key === "about") enabledModules.add("about");
    if (section.key === "posts") enabledModules.add("posts");
    if (section.key === "contact") enabledModules.add("contact");
  });

  const orderWeights = {
    featured: Number.MAX_SAFE_INTEGER,
    about: Number.MAX_SAFE_INTEGER,
    media: Number.MAX_SAFE_INTEGER,
    posts: Number.MAX_SAFE_INTEGER,
    events: Number.MAX_SAFE_INTEGER,
    contact: Number.MAX_SAFE_INTEGER,
  };

  visibleSections.forEach((section, index) => {
    if (section.key === "featured") orderWeights.featured = Math.min(orderWeights.featured, index);
    if (section.key === "gallery" || section.key === "video" || section.key === "audio") orderWeights.media = Math.min(orderWeights.media, index);
    if (section.key === "posts") orderWeights.posts = Math.min(orderWeights.posts, index);
    if (section.key === "events") orderWeights.events = Math.min(orderWeights.events, index);
    if (section.key === "about") orderWeights.about = Math.min(orderWeights.about, index);
    if (section.key === "contact") orderWeights.contact = Math.min(orderWeights.contact, index);
  });

  const moduleOrder = Object.entries(orderWeights)
    .filter(([module]) => enabledModules.has(module))
    .sort((left, right) => left[1] - right[1])
    .map(([module]) => module);

  return {
    enabledModules: Array.from(enabledModules),
    moduleOrder,
  };
}
