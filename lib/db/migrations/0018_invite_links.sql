create table "invites" (
  "id" serial primary key not null,
  "inviter_user_id" integer not null,
  "label" text,
  "code" text not null,
  "status" text default 'pending' not null,
  "expires_at" timestamp,
  "accepted_user_id" integer,
  "accepted_at" timestamp,
  "created_at" timestamp default now() not null,
  "updated_at" timestamp default now() not null,
  constraint "invites_code_unique" unique("code")
);
--> statement-breakpoint
alter table "invites" add constraint "invites_inviter_user_id_users_id_fk" foreign key ("inviter_user_id") references "public"."users"("id") on delete cascade on update no action;
--> statement-breakpoint
alter table "invites" add constraint "invites_accepted_user_id_users_id_fk" foreign key ("accepted_user_id") references "public"."users"("id") on delete set null on update no action;
