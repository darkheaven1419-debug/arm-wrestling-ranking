# 北京腕力排行榜

北京腕力运动员排名与信息平台。

## 功能

- 按左手/右手 × 体重级别（63/70/78/86/95/105/105+ kg）查看排名
- 任何人可提交运动员信息，管理员审核后上榜
- 管理员后台审核、通过、拒绝提交的申请

## 技术栈

React 19 + Vite + TypeScript + Tailwind CSS 4 + Framer Motion + Supabase

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase

1. 前往 [supabase.com](https://supabase.com) 创建免费项目
2. 在 SQL Editor 中执行 `supabase-schema.sql`
3. 在 Settings → API 中复制 URL 和 anon key
4. 复制 `.env.example` 为 `.env`，填入凭据：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 创建管理员账号

在 Supabase → Authentication → Users → Add User 中创建管理员账号。

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 部署

推送到 GitHub（main 分支）后自动部署到 GitHub Pages。需要在 GitHub 仓库 Settings → Secrets → Actions 中添加：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 项目结构

```
src/
├── components/     # Layout, Header, Footer
├── pages/          # HomePage, RankingPage, SubmitPage, LoginPage, AdminPage
├── lib/            # Supabase client, constants
└── types/          # TypeScript 类型定义
```
