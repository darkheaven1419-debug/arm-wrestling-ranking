UPDATE athletes a SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL
  AND (u.raw_user_meta_data->>'name' = a.name
    OR lower(a.name) = lower(COALESCE(u.raw_user_meta_data->>'full_name', '')));
