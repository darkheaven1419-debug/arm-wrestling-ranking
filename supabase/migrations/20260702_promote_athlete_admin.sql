-- Promote an athlete to admin by athlete_id
-- Only super_admin can call this function
CREATE OR REPLACE FUNCTION promote_athlete_to_admin(p_athlete_id BIGINT, p_admin_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  target_uid UUID;
  target_name TEXT;
BEGIN
  -- Check caller is super_admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN 'error: 仅超级管理员可以添加管理员';
  END IF;

  -- Look up the athlete's user_id
  SELECT user_id, name INTO target_uid, target_name
  FROM athletes
  WHERE id = p_athlete_id;

  IF target_uid IS NULL THEN
    RETURN 'error: 该运动员尚未关联账号，请先登录后提交信息或使用"关联账号"功能';
  END IF;

  -- Use provided name, or athlete name, or null
  INSERT INTO admin_users (user_id, role, display_name)
  VALUES (target_uid, 'admin', COALESCE(p_admin_name, target_name))
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'admin',
      display_name = COALESCE(p_admin_name, target_name, admin_users.display_name);

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
