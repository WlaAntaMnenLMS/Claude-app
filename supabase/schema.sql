-- ============================================================
-- L&D Assistant — Supabase Schema
-- Run this once in Supabase SQL Editor when setting up
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Profiles (extends auth.users) ────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'specialist',
  avatar     text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'specialist')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Instructors ───────────────────────────────────────────────
create table if not exists instructors (
  id             bigserial primary key,
  full_name      text not null,
  email          text,
  phone          text,
  specialization text,
  cv_url         text,
  linkedin_url   text,
  status         text not null default 'applied',
  rating         numeric,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── Demo Sessions ─────────────────────────────────────────────
create table if not exists demo_sessions (
  id            bigserial primary key,
  instructor_id bigint references instructors(id) on delete cascade,
  scheduled_at  timestamptz not null,
  duration_mins int default 60,
  location      text,
  topic         text,
  status        text default 'scheduled',
  feedback      text,
  score         int,
  created_at    timestamptz default now()
);

-- ── Clients ───────────────────────────────────────────────────
create table if not exists clients (
  id         bigserial primary key,
  name       text not null,
  contact    text,
  email      text,
  phone      text,
  industry   text,
  notes      text,
  created_at timestamptz default now()
);

-- ── Proposal Templates ────────────────────────────────────────
create table if not exists proposal_templates (
  id         bigserial primary key,
  name       text not null,
  content    text not null,
  variables  text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Proposals ─────────────────────────────────────────────────
create table if not exists proposals (
  id             bigserial primary key,
  client_id      bigint references clients(id) on delete set null,
  template_id    bigint references proposal_templates(id) on delete set null,
  title          text not null,
  program_name   text,
  content        text not null,
  variables_data text,
  status         text default 'draft',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── Learners ──────────────────────────────────────────────────
create table if not exists learners (
  id           bigserial primary key,
  full_name    text not null,
  national_id  text,
  email        text,
  phone        text,
  organization text,
  created_at   timestamptz default now()
);

-- ── Certificate Templates ─────────────────────────────────────
create table if not exists cert_templates (
  id         bigserial primary key,
  name       text not null,
  docx_url   text not null,
  variables  text,
  created_at timestamptz default now()
);

-- ── Certificates ──────────────────────────────────────────────
create table if not exists certificates (
  id            bigserial primary key,
  template_id   bigint references cert_templates(id) on delete set null,
  learner_id    bigint references learners(id) on delete set null,
  course_name   text not null,
  issue_date    text not null,
  cert_number   text,
  extra_data    text,
  doxx_order_id bigint,
  created_at    timestamptz default now()
);

-- ── Courses ───────────────────────────────────────────────────
create table if not exists courses (
  id          bigserial primary key,
  name        text not null,
  code        text,
  hours       int,
  category    text,
  description text,
  created_at  timestamptz default now()
);

-- ── Transcript Templates ──────────────────────────────────────
create table if not exists transcript_templates (
  id         bigserial primary key,
  name       text not null,
  docx_url   text not null,
  variables  text,
  created_at timestamptz default now()
);

-- ── Transcripts ───────────────────────────────────────────────
create table if not exists transcripts (
  id            bigserial primary key,
  template_id   bigint references transcript_templates(id) on delete set null,
  learner_id    bigint references learners(id) on delete set null,
  courses_data  text not null,
  doxx_order_id bigint,
  created_at    timestamptz default now()
);

-- ── Doxx Orders ───────────────────────────────────────────────
create table if not exists doxx_orders (
  id           bigserial primary key,
  order_type   text not null,
  document_ids text not null,
  quantity     int not null,
  recipient    text,
  address      text,
  status       text default 'pending',
  notes        text,
  created_at   timestamptz default now()
);

-- ── Communication Templates ───────────────────────────────────
create table if not exists communication_templates (
  id         bigserial primary key,
  name       text not null,
  channel    text not null default 'whatsapp',
  subject    text,
  body       text not null,
  variables  text,
  category   text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Agent History ─────────────────────────────────────────────
create table if not exists agent_history (
  id         bigserial primary key,
  role       text not null,
  content    text not null,
  intent     text,
  module     text,
  created_at timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table profiles              enable row level security;
alter table instructors           enable row level security;
alter table demo_sessions         enable row level security;
alter table clients               enable row level security;
alter table proposal_templates    enable row level security;
alter table proposals             enable row level security;
alter table learners              enable row level security;
alter table cert_templates        enable row level security;
alter table certificates          enable row level security;
alter table courses               enable row level security;
alter table transcript_templates  enable row level security;
alter table transcripts           enable row level security;
alter table doxx_orders           enable row level security;
alter table communication_templates enable row level security;
alter table agent_history         enable row level security;

do $$
declare
  tbl text;
  tables text[] := array[
    'profiles','instructors','demo_sessions','clients',
    'proposal_templates','proposals','learners',
    'cert_templates','certificates','courses',
    'transcript_templates','transcripts',
    'doxx_orders','communication_templates','agent_history'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'create policy if not exists "auth_all_%s" on %s for all to authenticated using (true) with check (true)',
      tbl, tbl
    );
  end loop;
end;
$$;

-- ── Default Communication Templates ──────────────────────────
insert into communication_templates (name, channel, body, variables, category) values
('Demo Confirmation', 'whatsapp',
'Hello {{instructor_name}},

This is a confirmation for your demo session at Trainnovation.

Date: {{demo_date}}
Time: {{demo_time}}
Location: {{location}}
Topic: {{topic}}

Please confirm your attendance.

Best regards,
Trainnovation Team',
'["instructor_name","demo_date","demo_time","location","topic"]', 'demo'),

('Certificate Ready', 'whatsapp',
'Hello {{learner_name}},

Congratulations! Your certificate for *{{course_name}}* is ready.

Certificate No: {{cert_number}}
Issue Date: {{issue_date}}

Please contact us to collect your certificate.

Best regards,
Trainnovation Team',
'["learner_name","course_name","cert_number","issue_date"]', 'certificate'),

('Proposal Follow-Up', 'whatsapp',
'Hello {{client_name}},

I wanted to follow up on the training proposal for *{{program_name}}*.

We would love to hear your feedback and discuss any adjustments.

Would you be available for a quick call this week?

Best regards,
{{sender_name}}
Trainnovation',
'["client_name","program_name","sender_name"]', 'proposal'),

('Transcript Ready', 'whatsapp',
'Hello {{learner_name}},

Your academic transcript has been prepared and is ready for collection.

Issued: {{issue_date}}

Please visit our office with your ID to collect it.

Best regards,
Trainnovation Team',
'["learner_name","issue_date"]', 'transcript');

-- ── Storage Buckets (create manually in Supabase dashboard) ──
-- Bucket: "templates"  (public: true)  — for DOCX templates
-- Bucket: "cvs"        (public: false) — for instructor CVs
