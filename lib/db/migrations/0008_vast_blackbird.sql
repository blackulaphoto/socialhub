create index if not exists posts_user_id_created_at_idx
  on posts (user_id, created_at desc, id desc);

create index if not exists posts_visibility_created_at_idx
  on posts (visibility, created_at desc, id desc);

create index if not exists posts_repost_of_post_id_idx
  on posts (repost_of_post_id);

create index if not exists post_media_post_id_created_at_idx
  on post_media (post_id, created_at desc);

create index if not exists post_likes_post_id_idx
  on post_likes (post_id);

create index if not exists post_likes_user_id_idx
  on post_likes (user_id);

create index if not exists post_reactions_post_id_idx
  on post_reactions (post_id);

create index if not exists post_reactions_user_id_idx
  on post_reactions (user_id);

create index if not exists post_comments_post_id_created_at_idx
  on post_comments (post_id, created_at desc);

create index if not exists group_posts_group_id_id_idx
  on group_posts (group_id, id desc);

create index if not exists group_members_user_id_idx
  on group_members (user_id);

create index if not exists follows_follower_id_idx
  on follows (follower_id);

create index if not exists follows_following_id_idx
  on follows (following_id);

create index if not exists friendships_requester_user_id_idx
  on friendships (requester_user_id);

create index if not exists friendships_addressee_user_id_idx
  on friendships (addressee_user_id);

create index if not exists user_blocks_blocker_user_id_idx
  on user_blocks (blocker_user_id);

create index if not exists user_blocks_blocked_user_id_idx
  on user_blocks (blocked_user_id);

create index if not exists notifications_user_id_created_at_idx
  on notifications (user_id, created_at desc);

create index if not exists messages_conversation_id_created_at_idx
  on messages (conversation_id, created_at desc);

create index if not exists messages_sender_id_idx
  on messages (sender_id);
