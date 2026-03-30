import { Router } from "express";
import { artistProfilesTable, db, eventsTable, followsTable, groupsTable, pool, usersTable } from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { formatArtistProfile, formatEvent, formatGroup, getBlockedUserIds, getFriendshipState, getUserSummary } from "./helpers.js";
import { expandLocationTerms } from "../lib/locations.js";

const router = Router();

type SearchType = "all" | "users" | "artists" | "groups" | "events";

function clampLimit(value: string | undefined) {
  const parsed = value ? Number(value) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.max(1, Math.min(parsed, 50));
}

async function searchUserIds(input: {
  q: string;
  locationTerms: string[];
  blockedUserIds: number[];
  limit: number;
}) {
  const query = `
    select
      u.id,
      (
        ts_rank_cd(to_tsvector('simple', coalesce(u.username, '')), websearch_to_tsquery('simple', $1)) * 2.5 +
        ts_rank_cd(to_tsvector('english', coalesce(u.bio, '')), websearch_to_tsquery('english', $1)) +
        ts_rank_cd(to_tsvector('english', coalesce(d.about, '')), websearch_to_tsquery('english', $1)) +
        ts_rank_cd(to_tsvector('simple', coalesce(d.location, '') || ' ' || coalesce(d.city, '')), websearch_to_tsquery('simple', $1))
      ) as rank,
      greatest(
        similarity(coalesce(u.username, ''), $1),
        similarity(coalesce(u.bio, ''), $1),
        similarity(coalesce(d.about, ''), $1),
        similarity(coalesce(d.location, ''), $1),
        similarity(coalesce(d.city, ''), $1)
      ) as fuzzy_score
    from users u
    left join user_profile_details d on d.user_id = u.id
    where
      (
        $1 = '' or
        to_tsvector('simple', coalesce(u.username, '')) @@ websearch_to_tsquery('simple', $1) or
        to_tsvector('english', coalesce(u.bio, '')) @@ websearch_to_tsquery('english', $1) or
        to_tsvector('english', coalesce(d.about, '')) @@ websearch_to_tsquery('english', $1) or
        to_tsvector('simple', coalesce(d.location, '') || ' ' || coalesce(d.city, '')) @@ websearch_to_tsquery('simple', $1) or
        similarity(coalesce(u.username, ''), $1) > 0.14 or
        similarity(coalesce(u.bio, ''), $1) > 0.12 or
        similarity(coalesce(d.about, ''), $1) > 0.12 or
        similarity(coalesce(d.location, ''), $1) > 0.16 or
        similarity(coalesce(d.city, ''), $1) > 0.16
      )
      and (
        cardinality($2::text[]) = 0 or
        exists (
          select 1
          from unnest($2::text[]) as term
          where
            coalesce(d.location, '') ilike ('%' || term || '%') or
            coalesce(d.city, '') ilike ('%' || term || '%')
        )
      )
      and (
        cardinality($3::int[]) = 0 or
        not (u.id = any($3::int[]))
      )
    order by
      case when $1 = '' then 0 else 1 end desc,
      rank desc,
      fuzzy_score desc,
      u.created_at desc
    limit $4
  `;

  const result = await pool.query<{ id: number }>(query, [
    input.q,
    input.locationTerms,
    input.blockedUserIds,
    input.limit,
  ]);

  return result.rows.map((row) => row.id);
}

async function searchArtistUserIds(input: {
  q: string;
  locationTerms: string[];
  category: string;
  tagList: string[];
  blockedUserIds: number[];
  limit: number;
}) {
  const query = `
    select
      a.user_id as "userId",
      (
        ts_rank_cd(to_tsvector('simple', coalesce(a.display_name, '')), websearch_to_tsquery('simple', $1)) * 3 +
        ts_rank_cd(to_tsvector('simple', coalesce(u.username, '')), websearch_to_tsquery('simple', $1)) * 2.2 +
        ts_rank_cd(to_tsvector('english', coalesce(a.category, '')), websearch_to_tsquery('english', $1)) * 1.5 +
        ts_rank_cd(to_tsvector('english', coalesce(a.tagline, '')), websearch_to_tsquery('english', $1)) +
        ts_rank_cd(to_tsvector('english', coalesce(a.bio, '')), websearch_to_tsquery('english', $1)) +
        ts_rank_cd(to_tsvector('simple', coalesce(a.location, '') || ' ' || coalesce(d.city, '') || ' ' || coalesce(d.location, '') || ' ' || array_to_string(coalesce(a.tags, '{}'), ' ')), websearch_to_tsquery('simple', $1))
      ) as rank,
      greatest(
        similarity(coalesce(a.display_name, ''), $1),
        similarity(coalesce(u.username, ''), $1),
        similarity(coalesce(a.category, ''), $1),
        similarity(coalesce(a.tagline, ''), $1),
        similarity(coalesce(a.location, ''), $1),
        similarity(coalesce(d.city, ''), $1),
        similarity(coalesce(d.location, ''), $1),
        similarity(array_to_string(coalesce(a.tags, '{}'), ' '), $1)
      ) as fuzzy_score
    from artist_profiles a
    inner join users u on u.id = a.user_id
    left join user_profile_details d on d.user_id = a.user_id
    where
      (
        $1 = '' or
        to_tsvector('simple', coalesce(a.display_name, '')) @@ websearch_to_tsquery('simple', $1) or
        to_tsvector('simple', coalesce(u.username, '')) @@ websearch_to_tsquery('simple', $1) or
        to_tsvector('english', coalesce(a.category, '')) @@ websearch_to_tsquery('english', $1) or
        to_tsvector('english', coalesce(a.tagline, '')) @@ websearch_to_tsquery('english', $1) or
        to_tsvector('english', coalesce(a.bio, '')) @@ websearch_to_tsquery('english', $1) or
        to_tsvector('simple', coalesce(a.location, '') || ' ' || coalesce(d.city, '') || ' ' || coalesce(d.location, '') || ' ' || array_to_string(coalesce(a.tags, '{}'), ' ')) @@ websearch_to_tsquery('simple', $1) or
        similarity(coalesce(a.display_name, ''), $1) > 0.14 or
        similarity(coalesce(u.username, ''), $1) > 0.14 or
        similarity(coalesce(a.category, ''), $1) > 0.14 or
        similarity(coalesce(a.tagline, ''), $1) > 0.12 or
        similarity(coalesce(a.location, ''), $1) > 0.16 or
        similarity(coalesce(d.city, ''), $1) > 0.16 or
        similarity(coalesce(d.location, ''), $1) > 0.16 or
        similarity(array_to_string(coalesce(a.tags, '{}'), ' '), $1) > 0.14
      )
      and (
        cardinality($2::text[]) = 0 or
        exists (
          select 1
          from unnest($2::text[]) as term
          where
            coalesce(a.location, '') ilike ('%' || term || '%') or
            coalesce(d.city, '') ilike ('%' || term || '%') or
            coalesce(d.location, '') ilike ('%' || term || '%')
        )
      )
      and ($3 = '' or coalesce(a.category, '') ilike ('%' || $3 || '%'))
      and (
        cardinality($4::text[]) = 0 or
        coalesce(a.tags, '{}') && $4::text[]
      )
      and (
        cardinality($5::int[]) = 0 or
        not (a.user_id = any($5::int[]))
      )
    order by
      case when $1 = '' then 0 else 1 end desc,
      rank desc,
      fuzzy_score desc,
      a.updated_at desc
    limit $6
  `;

  const result = await pool.query<{ userId: number }>(query, [
    input.q,
    input.locationTerms,
    input.category,
    input.tagList,
    input.blockedUserIds,
    input.limit,
  ]);

  return result.rows.map((row) => row.userId);
}

async function searchGroupIds(input: {
  q: string;
  locationTerms: string[];
  category: string;
  tagList: string[];
  limit: number;
}) {
  const conditions = [];
  if (input.q) {
    conditions.push(or(
      ilike(groupsTable.name, `%${input.q}%`),
      ilike(groupsTable.description, `%${input.q}%`),
      ilike(groupsTable.category, `%${input.q}%`),
    ));
  }
  if (input.locationTerms.length > 0) {
    conditions.push(or(...input.locationTerms.map((term) => ilike(groupsTable.location, `%${term}%`))));
  }
  if (input.category) {
    conditions.push(ilike(groupsTable.category, `%${input.category}%`));
  }
  if (input.tagList.length > 0) {
    conditions.push(sql`${groupsTable.tags} && ${input.tagList}`);
  }

  const groups = await db.select({ id: groupsTable.id }).from(groupsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(groupsTable.updatedAt))
    .limit(input.limit);

  return groups.map((group) => group.id);
}

async function searchEventIds(input: {
  q: string;
  locationTerms: string[];
  tagList: string[];
  limit: number;
}) {
  const conditions = [];
  if (input.q) {
    conditions.push(or(
      ilike(eventsTable.title, `%${input.q}%`),
      ilike(eventsTable.description, `%${input.q}%`),
      ilike(eventsTable.location, `%${input.q}%`),
    ));
  }
  if (input.locationTerms.length > 0) {
    conditions.push(or(
      ...input.locationTerms.flatMap((term) => [
        ilike(eventsTable.location, `%${term}%`),
        ilike(eventsTable.city, `%${term}%`),
      ]),
    ));
  }
  if (input.tagList.length > 0) {
    conditions.push(sql`${eventsTable.lineupTags} && ${input.tagList}`);
  }

  const events = await db.select({ id: eventsTable.id }).from(eventsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(eventsTable.startsAt)
    .limit(input.limit);

  return events.map((event) => event.id);
}

router.get("/search", async (req, res) => {
  const {
    q = "",
    type = "all",
    location = "",
    category = "",
    tags = "",
    limit,
  } = req.query as Record<string, string>;

  const normalizedQuery = q.trim();
  const normalizedLocation = location.trim();
  const locationTerms = expandLocationTerms(normalizedLocation);
  const normalizedCategory = category.trim();
  const tagList = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const safeType: SearchType = type === "users" || type === "artists" || type === "groups" || type === "events" ? type : "all";
  const safeLimit = clampLimit(limit);

  if (!normalizedQuery && locationTerms.length === 0 && !normalizedCategory && tagList.length === 0) {
    res.json({ users: [], artists: [], groups: [], events: [], total: 0, usersTotal: 0, artistsTotal: 0, groupsTotal: 0, eventsTotal: 0 });
    return;
  }

  const blockedUserIds = await getBlockedUserIds(req.session.userId);

  const userIds = safeType === "all" || safeType === "users"
    ? await searchUserIds({
      q: normalizedQuery,
      locationTerms,
      blockedUserIds,
      limit: safeLimit,
    })
    : [];

  const artistUserIds = safeType === "all" || safeType === "artists"
    ? await searchArtistUserIds({
      q: normalizedQuery,
      locationTerms,
      category: normalizedCategory,
      tagList,
      blockedUserIds,
      limit: safeLimit,
    })
    : [];

  const groupIds = safeType === "all" || safeType === "groups"
    ? await searchGroupIds({
      q: normalizedQuery,
      locationTerms,
      category: normalizedCategory,
      tagList,
      limit: safeLimit,
    })
    : [];

  const eventIds = safeType === "all" || safeType === "events"
    ? await searchEventIds({
      q: normalizedQuery,
      locationTerms,
      tagList,
      limit: safeLimit,
    })
    : [];

  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const artists = artistUserIds.length > 0
    ? await db.select().from(artistProfilesTable)
      .innerJoin(usersTable, eq(artistProfilesTable.userId, usersTable.id))
      .where(inArray(artistProfilesTable.userId, artistUserIds))
    : [];
  const groups = groupIds.length > 0
    ? await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds))
    : [];
  const events = eventIds.length > 0
    ? await db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds))
    : [];

  const userMap = new Map(users.map((user) => [user.id, user]));
  const artistMap = new Map(artists.map((row) => [row.artist_profiles.userId, row]));
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const eventMap = new Map(events.map((event) => [event.id, event]));

  const relatedUserIds = [...new Set([...userIds, ...artistUserIds])];
  const followRows = req.session.userId && relatedUserIds.length > 0
    ? await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(
      eq(followsTable.followerId, req.session.userId),
      inArray(followsTable.followingId, relatedUserIds),
    ))
    : [];
  const followingSet = new Set(followRows.map((row) => row.followingId));

  const orderedUsers = await Promise.all(
    userIds
      .map((id) => userMap.get(id))
      .filter(Boolean)
      .map(async (user) => ({
        ...(await getUserSummary(user!, req.session.userId)),
        friendship: await getFriendshipState(req.session.userId, user!.id),
        isFollowing: followingSet.has(user!.id),
      })),
  );

  const orderedArtists = await Promise.all(
    artistUserIds
      .map((id) => artistMap.get(id))
      .filter(Boolean)
      .map(async (row) => ({
        ...(await formatArtistProfile(row!.artist_profiles, row!.users, req.session.userId)),
        isFollowing: followingSet.has(row!.artist_profiles.userId),
      })),
  );

  const orderedGroups = await Promise.all(
    groupIds
      .map((id) => groupMap.get(id))
      .filter(Boolean)
      .map((group) => formatGroup(group!, req.session.userId)),
  );

  const orderedEvents = await Promise.all(
    eventIds
      .map((id) => eventMap.get(id))
      .filter(Boolean)
      .map((event) => formatEvent(event!)),
  );

  res.json({
    users: orderedUsers,
    artists: orderedArtists,
    groups: orderedGroups,
    events: orderedEvents,
    total: orderedUsers.length + orderedArtists.length + orderedGroups.length + orderedEvents.length,
    usersTotal: orderedUsers.length,
    artistsTotal: orderedArtists.length,
    groupsTotal: orderedGroups.length,
    eventsTotal: orderedEvents.length,
  });
});

export default router;
