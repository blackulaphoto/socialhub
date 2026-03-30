alter table user_profile_details
  add column if not exists onboarding_completed boolean not null default false;

alter table user_profile_details
  add column if not exists onboarding_step text not null default 'profile';
