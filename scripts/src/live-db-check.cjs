const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const artists = await client.query('select count(*)::int as count from artist_profiles');
  const users = await client.query('select count(*)::int as count from users');
  const details = await client.query('select count(*)::int as count from user_profile_details');
  const sample = await client.query(`
    select
      u.id,
      u.username,
      ap.display_name,
      ap.category,
      ap.location,
      upd.city,
      upd.location as profile_location,
      coalesce(array_length(ap.tags, 1), 0) as tag_count
    from users u
    left join artist_profiles ap on ap.user_id = u.id
    left join user_profile_details upd on upd.user_id = u.id
    order by u.id
    limit 20
  `);

  console.log(JSON.stringify({
    counts: {
      artists: artists.rows[0].count,
      users: users.rows[0].count,
      details: details.rows[0].count,
    },
    sample: sample.rows,
  }, null, 2));

  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
