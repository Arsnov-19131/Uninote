-- ============================================================
-- AI Study Toolkit — Supabase Postgres Schema & RLS Policies
-- Migration: 001_core_tables.sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  reading_level text check (reading_level in ('simple', 'normal', 'detailed')) default 'simple',
  timezone text default 'UTC',
  notification_settings jsonb default '{"push": true, "email": false}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Subjects (Roadmap Folders)
create table if not exists public.subjects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  color text not null,
  exam_date timestamptz,
  sort_order integer default 0 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Topics (Roadmap Checkboxes & Subtopics)
create table if not exists public.topics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  parent_topic_id uuid references public.topics on delete cascade,
  title text not null,
  covered boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Planner Tasks
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  type text not null,
  subject_id uuid references public.subjects on delete set null,
  topic_id uuid references public.topics on delete set null,
  due_at timestamptz not null,
  reminder_offsets integer[] default array[60],
  effort_estimate integer default 60,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  description text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Notifications
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references public.tasks on delete cascade,
  send_at timestamptz not null,
  channel text check (channel in ('push', 'in_app', 'email')) default 'in_app',
  sent_at timestamptz,
  status text check (status in ('pending', 'sent', 'failed')) default 'pending',
  read boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 6. Notes Vault
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  body text default '',
  format text default 'markdown',
  subject_id uuid references public.subjects on delete set null,
  tags text[] default array[]::text[],
  deleted_at timestamptz, -- soft delete for 30-day Trash safety net
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. Resources
create table if not exists public.resources (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  kind text not null,
  content text default '',
  subject_id uuid references public.subjects on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 8. Quizzes & Questions
create table if not exists public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  topic_ids uuid[] default array[]::uuid[],
  source_type text not null,
  source_ids text[] default array[]::text[],
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes on delete cascade not null,
  type text not null,
  question text not null,
  options text[],
  correct_answer text not null,
  key_points text[] default array[]::text[],
  source_reference text
);

create table if not exists public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  quiz_id uuid references public.quizzes on delete cascade not null,
  started_at timestamptz default timezone('utc'::text, now()) not null,
  finished_at timestamptz,
  total_score numeric(4, 2)
);

create table if not exists public.attempt_answers (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.quiz_attempts on delete cascade not null,
  question_id uuid references public.quiz_questions on delete cascade not null,
  answer text not null,
  score numeric(3, 2) not null,
  feedback text default '',
  overridden boolean default false not null
);

-- 9. Chat Sessions & Keywords
create table if not exists public.chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  subject_id uuid references public.subjects on delete set null,
  source_selection text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.keywords (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  term text not null,
  definition text not null,
  saved_to_glossary boolean default false not null
);

-- 10. Progress Snapshots & Suggestions
create table if not exists public.progress_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  readiness_percent integer not null,
  coverage_percent integer not null,
  quiz_score_percent integer,
  weak_topic_ids uuid[] default array[]::uuid[],
  calculated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.suggestions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete cascade not null,
  type text not null,
  message text not null,
  payload jsonb default '{}'::jsonb,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ============================================================
-- Row Level Security (RLS) - Each student can only read/edit own rows
-- ============================================================
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.notes enable row level security;
alter table public.resources enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.suggestions enable row level security;

-- RLS Policies
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users manage own subjects" on public.subjects for all using (auth.uid() = user_id);
create policy "Users manage own topics" on public.topics for all using (auth.uid() = user_id);
create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id);
create policy "Users manage own notifications" on public.notifications for all using (auth.uid() = user_id);
create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id);
create policy "Users manage own resources" on public.resources for all using (auth.uid() = user_id);
create policy "Users manage own quizzes" on public.quizzes for all using (auth.uid() = user_id);
create policy "Users manage own quiz_attempts" on public.quiz_attempts for all using (auth.uid() = user_id);
create policy "Users manage own chat_sessions" on public.chat_sessions for all using (auth.uid() = user_id);
create policy "Users manage own progress_snapshots" on public.progress_snapshots for all using (auth.uid() = user_id);
create policy "Users manage own suggestions" on public.suggestions for all using (auth.uid() = user_id);
