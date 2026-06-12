# 北京腕力排行榜 — 项目上下文

## 技术栈
- React 19 + TypeScript 6 + Vite 8
- Supabase (数据库 + Auth + Storage)
- Tailwind CSS 4 + Framer Motion
- Leaflet + react-leaflet (地图)
- TanStack Query (数据获取)
- 高德地图 API (地图瓦片 + 搜索 + 输入提示)

## 部署
- GitHub Pages (darkheaven1419-debug/arm-wrestling-ranking)
- GitHub Actions 自动部署 (.github/workflows/deploy.yml)
- 推送 main 分支自动触发构建和部署
- Supabase 项目: dqsodgwpxiklpyohwqhg
- 高德 Key: caebe53a59fbf7c9037376b1cf411543

## 项目结构
```
src/
├── components/
│   ├── admin/        # RankingTab, AdminsTab（从 AdminPage 拆分出来）
│   ├── map/          # NavMenu, SpotMarker（地图共享组件）
│   ├── Header.tsx    # 导航栏 + 主题切换
│   ├── Layout.tsx    # 布局 + 回到顶部按钮
│   ├── Footer.tsx
│   └── ErrorBoundary.tsx
├── pages/
│   ├── HomePage.tsx       # 首页
│   ├── RankingPage.tsx    # 排名（含搜索框）
│   ├── AthletePage.tsx    # 选手详情
│   ├── SubmitPage.tsx     # 提交/编辑运动员
│   ├── MapPage.tsx        # 统一地图（集训+赛事&活动）
│   ├── TrainingPage.tsx   # 集训点管理（添加/编辑表单 + 地图选址）
│   ├── EventsPage.tsx     # 赛事&活动页（旧版，保留兼容）
│   ├── AdminPage.tsx      # 管理后台（审核/排名/管理员/公告/赛事/文章）
│   ├── ArticlesPage.tsx
│   ├── ArticleDetailPage.tsx
│   ├── LoginPage.tsx
│   └── ProfilePage.tsx
├── lib/
│   ├── supabase.ts    # Supabase 客户端
│   ├── geocode.ts     # 高德 API 搜索 + 地理编码（回退 OSM）
│   ├── image.ts       # 浏览器端图片压缩
│   ├── powerLevel.ts  # 战力值计算
│   ├── constants.ts   # 常量（级别、城市等）
│   └── badges.ts
└── types/index.ts     # Athlete, TrainingLocation, ArmEvent 等类型
```

## 数据库核心表
- athletes: id, name, codename, gender, hand, weight_class, city, status, rank_score, rank_score_left, is_featured, is_unknown_power, user_id, user_email, video_urls
- training_locations: id, name, address, latitude, longitude, images[], cover_index, table_count, organization, schedule, contact_person, contact_phone, description, status
- admin_users: id, user_id, role (super_admin/admin), display_name
- events: id, title, event_date, location, latitude, longitude, weight_classes, poster_urls, registration_fee, prizes, contact_person
- articles, announcements, battle_records

## 重要功能已实现
1. 实力未知标记 (is_unknown_power) — 所有页面显示"未知"而非战力数字
2. 管理员一键提升: 审核页面的"设为管理员"按钮 + RPC promote_athlete_to_admin
3. 集训多图上传 + 封面设置 + 自动压缩
4. 高德中文地图 + 点击选址 + 搜索定位（国内无需 VPN）
5. 多导航 App 跳转（高德/百度/腾讯/Apple/Google）
6. PWA 支持 (manifest.json + sw.js)
7. 深色/浅色主题切换
8. 图片懒加载 + SEO 优化

## 用户偏好
- 所有界面使用简体中文
- 默认深色主题
- 不想在卡片上显示排名数字角标
- 赛事改名为"赛事&活动"
- 管理员添加的内容直接通过，不需要审核

## 常见操作
- 本地开发: `npm run dev`
- 构建: `npm run build`
- 部署迁移: `npx supabase db push --linked`
- 推送部署: `git push origin main`
