-- ================================================================================
-- 北京腕力排行榜 — Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- ================================================================================

-- 1. 创建 athletes 表
CREATE TABLE athletes (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  gender        TEXT DEFAULT '男',
  hand          TEXT NOT NULL CHECK (hand IN ('左手', '右手')),
  weight_class  TEXT NOT NULL CHECK (weight_class IN ('63kg', '70kg', '78kg', '86kg', '95kg', '105kg', '105kg+')),
  body_weight   NUMERIC(5,1),
  city          TEXT DEFAULT '北京',
  team          TEXT,
  achievements  TEXT,
  bio           TEXT,
  contact       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rank_score    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 admin_users 表（管理员列表）
CREATE TABLE admin_users (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================================
-- RLS 策略
-- ================================================================================

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 辅助函数：检查当前用户是否是管理员
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================
-- athletes 表策略
-- ================================================================================

-- 任何人都可以读取已审核通过的运动员
CREATE POLICY "Anyone can read approved athletes"
  ON athletes FOR SELECT
  USING (status = 'approved');

-- 管理员可以读取所有运动员（管理后台用）
CREATE POLICY "Admins can read all athletes"
  ON athletes FOR SELECT
  USING (is_admin());

-- 任何人都可以插入（提交申请）
CREATE POLICY "Anyone can insert athletes"
  ON athletes FOR INSERT
  WITH CHECK (true);

-- 仅管理员可以更新
CREATE POLICY "Admins can update athletes"
  ON athletes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 仅管理员可以删除
CREATE POLICY "Admins can delete athletes"
  ON athletes FOR DELETE
  USING (is_admin());

-- ================================================================================
-- admin_users 表策略
-- ================================================================================

-- 管理员可以读取管理员列表
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  USING (is_admin());

-- 仅超级管理员可以添加管理员
CREATE POLICY "Super admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 仅超级管理员可以删除管理员
CREATE POLICY "Super admins can delete admin_users"
  ON admin_users FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ================================================================================
-- 触发器
-- ================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================================
-- 辅助函数：通过邮箱添加管理员（仅超级管理员可调用）
-- ================================================================================

CREATE OR REPLACE FUNCTION add_admin_by_email(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_uid UUID;
BEGIN
  -- 检查调用者是否是超级管理员
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN 'error: 仅超级管理员可以添加管理员';
  END IF;

  -- 通过邮箱查找用户
  SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
  IF target_uid IS NULL THEN
    RETURN 'error: 未找到该邮箱对应的用户，请先让对方注册账号';
  END IF;

  -- 添加为管理员
  INSERT INTO admin_users (user_id, role) VALUES (target_uid, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================
-- 初始化说明
-- ================================================================================
-- 执行完以上 SQL 后，手动在 Supabase Auth 中创建你的管理员账号：
--   Authentication → Users → Add User → 填写邮箱和密码
-- 然后查询你的 user ID：
--   SELECT id FROM auth.users WHERE email = '你的邮箱';
-- 再将你的 user ID 添加为超级管理员：
--   INSERT INTO admin_users (user_id, role) VALUES ('你的user-id', 'super_admin');
-- 之后你就可以在管理后台中添加其他管理员了。
