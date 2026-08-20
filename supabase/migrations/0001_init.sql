-- IG Post Studio 的最小 schema：一張 posts 表 + 一個放圖的 bucket。
-- 在 Supabase Dashboard 的 SQL Editor 整份貼上執行即可。

-- ── posts ────────────────────────────────────────────────────────────────
-- slides 存成 jsonb：版型是編輯器自己的結構（見 src/lib/types.ts 的 Slide），
-- 不需要被 SQL 查詢，拆成關聯表只會多一層對映而換不到任何東西。
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null default '未命名貼文',
  handle      text        not null default '',
  timestamp   text        not null default '',
  theme       text        not null default 'dark',
  slides      jsonb       not null default '[]'::jsonb,
  draft       text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 清單依建立時間排序（新的在前）。刻意不用 updated_at：
-- 否則每打一個字都會讓貼文跳到清單最前面。
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- RLS policy 只決定「哪些列看得到」，能不能碰這張表是另一件事：
-- 新版 Supabase 不再對 public schema 給 anon 預設權限，少了這行會是
-- permission denied for table posts（policy 寫得再對也一樣）。
grant select, insert, update, delete on public.posts to anon, authenticated;

-- ⚠️ 還沒有 Auth，所以這條 policy 等於「拿到 anon key 的人都能讀寫全部貼文」。
-- 接上 Supabase Auth 之後要換成 owner = auth.uid() 的版本，並加上 owner 欄位。
drop policy if exists posts_anon_all on public.posts;
create policy posts_anon_all on public.posts
  for all to anon, authenticated
  using (true) with check (true);

-- ── storage ──────────────────────────────────────────────────────────────
-- public bucket：匯出是在瀏覽器用 html-to-image 把圖 fetch 回來畫進 canvas，
-- 走 signed URL 會讓每張圖多一次簽章往返，公開讀取單純得多。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images', 'post-images', true, 10485760,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_images_read on storage.objects;
create policy post_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'post-images');

drop policy if exists post_images_write on storage.objects;
create policy post_images_write on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'post-images');

drop policy if exists post_images_delete on storage.objects;
create policy post_images_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'post-images');
