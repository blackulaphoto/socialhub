create extension if not exists pg_trgm;

create index if not exists users_username_trgm_idx
  on users
  using gin (username gin_trgm_ops);

create index if not exists users_bio_trgm_idx
  on users
  using gin (bio gin_trgm_ops);

create index if not exists user_profile_details_location_city_trgm_idx
  on user_profile_details
  using gin (((coalesce(location, '') || ' ' || coalesce(city, ''))) gin_trgm_ops);

create index if not exists user_profile_details_about_trgm_idx
  on user_profile_details
  using gin (about gin_trgm_ops);

create index if not exists artist_profiles_category_trgm_idx
  on artist_profiles
  using gin (category gin_trgm_ops);

create index if not exists artist_profiles_location_trgm_idx
  on artist_profiles
  using gin (location gin_trgm_ops);

create index if not exists artist_profiles_tagline_trgm_idx
  on artist_profiles
  using gin (tagline gin_trgm_ops);

create index if not exists artist_profiles_bio_trgm_idx
  on artist_profiles
  using gin (bio gin_trgm_ops);

create index if not exists artist_profiles_tags_gin_idx
  on artist_profiles
  using gin (tags);
