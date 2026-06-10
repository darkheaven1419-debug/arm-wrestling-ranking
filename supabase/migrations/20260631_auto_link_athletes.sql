UPDATE athletes a SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL AND a.contact IS NOT NULL
  AND (lower(u.email) LIKE '%' || lower(a.contact) || '%'
    OR lower(a.contact) LIKE '%' || split_part(u.email, '@', 1) || '%');
