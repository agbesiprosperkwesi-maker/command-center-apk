-- Run once in Supabase SQL Editor as project owner.
-- Adds shared daily checklist, authorised student register and call follow-up tracking.
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  task_date date not null default current_date,
  title text not null,
  category text not null default 'Daily operations',
  owner_name text,
  due_time time,
  completed boolean not null default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(task_date,title)
);

alter table public.stations add column if not exists target_votes integer not null default 0;

insert into public.stations(name,target_votes) values
  ('FBMS',1000),
  ('FAST A',1500),
  ('FAST B',1000),
  ('FOE',1000),
  ('FBNE',1000),
  ('FHAS',1000)
on conflict(name) do update set target_votes = excluded.target_votes;

alter table public.stations add column if not exists target_votes integer not null default 0;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  full_name text not null,
  phone text,
  programme text,
  level text,
  station text check(station is null or station in ('FBMS','FAST A','FAST B','FOE','FBNE','FHAS')),
  eligibility_verified boolean not null default false,
  call_status text not null default 'Not called' check(call_status in ('Not called','Called','Follow-up needed','Do not contact','Completed')),
  assigned_caller text,
  last_called_at timestamptz,
  call_outcome text,
  follow_up_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  called_at timestamptz not null default now(),
  caller_name text,
  outcome text not null,
  follow_up_date date,
  notes text,
  created_by uuid references auth.users(id)
);

alter table public.daily_tasks enable row level security;
alter table public.students enable row level security;
alter table public.call_logs enable row level security;

drop policy if exists daily_tasks_read on public.daily_tasks;
create policy daily_tasks_read on public.daily_tasks for select to authenticated
using (public.has_any_role(array['admin','finance','coordinator','viewer']::public.app_role[]));
drop policy if exists daily_tasks_write on public.daily_tasks;
create policy daily_tasks_write on public.daily_tasks for all to authenticated
using (public.has_any_role(array['admin','coordinator']::public.app_role[]))
with check (public.has_any_role(array['admin','coordinator']::public.app_role[]));

drop policy if exists students_read on public.students;
create policy students_read on public.students for select to authenticated
using (public.has_any_role(array['admin','coordinator']::public.app_role[]));
drop policy if exists students_write on public.students;
create policy students_write on public.students for all to authenticated
using (public.has_any_role(array['admin','coordinator']::public.app_role[]))
with check (public.has_any_role(array['admin','coordinator']::public.app_role[]));

drop policy if exists call_logs_read on public.call_logs;
create policy call_logs_read on public.call_logs for select to authenticated
using (public.has_any_role(array['admin','coordinator']::public.app_role[]));
drop policy if exists call_logs_write on public.call_logs;
create policy call_logs_write on public.call_logs for all to authenticated
using (public.has_any_role(array['admin','coordinator']::public.app_role[]))
with check (public.has_any_role(array['admin','coordinator']::public.app_role[]));

create or replace function public.ensure_daily_checklist()
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_any_role(array['admin','coordinator']::public.app_role[]) then
    raise exception 'Only admins or coordinators can create the daily checklist';
  end if;
  insert into public.daily_tasks(task_date,title,category) values
    (current_date,'Review campaign priorities and team updates','Daily operations'),
    (current_date,'Morning briefing and team roll-call','Daily operations'),
    (current_date,'Check sponsor updates and outstanding pledges','Finance'),
    (current_date,'Call assigned students and record outcomes','Student outreach'),
    (current_date,'Visit assigned student hostels and update visit status','Student outreach'),
    (current_date,'Check faculty, department and student availability','Student outreach'),
    (current_date,'Follow up with volunteers and station coordinators','Team coordination'),
    (current_date,'Review flyer distribution and campaign materials','Publicity'),
    (current_date,'Confirm transport and logistics requirements','Logistics'),
    (current_date,'Review polling-agent assignments and readiness','Station readiness'),
    (current_date,'Check volunteer attendance and coverage gaps','Team coordination'),
    (current_date,'Confirm finance and expenditure updates','Finance'),
    (current_date,'Review logistics and staffing risks for the day','Logistics'),
    (current_date,'Submit the end-of-day progress report','Evening review'),
    (current_date,'Log incidents and escalate urgent issues','Risk review'),
    (current_date,'Close out the day and plan tomorrow''s priorities','Evening review'),
    (current_date,'End-of-day notes','Evening review')
  on conflict(task_date,title) do nothing;
end; $$;
grant execute on function public.ensure_daily_checklist() to authenticated;

create index if not exists students_name_idx on public.students using gin (to_tsvector('simple', full_name));
create index if not exists students_station_idx on public.students(station);
create index if not exists students_followup_idx on public.students(follow_up_date) where follow_up_date is not null;
create index if not exists daily_tasks_date_idx on public.daily_tasks(task_date,completed);
create index if not exists call_logs_student_idx on public.call_logs(student_id,called_at desc);

-- Table privileges are still constrained by the row-level security policies above.
grant select,insert,update,delete on public.daily_tasks, public.students, public.call_logs to authenticated;

-- Student outreach fields requested for the live command centre.
alter table public.students add column if not exists faculty text;
alter table public.students add column if not exists department text;
alter table public.students add column if not exists voter_group text;
alter table public.students add column if not exists campus_status text not null default 'Unknown';
alter table public.students add column if not exists hostel_visit_status text not null default 'Not visited';
alter table public.students add column if not exists hostel_visit_date date;
alter table public.students add column if not exists updated_at timestamptz not null default now();
create index if not exists students_faculty_department_idx on public.students(faculty,department);
create index if not exists students_hostel_visit_idx on public.students(hostel_visit_status,hostel_visit_date);

-- Keep the default daily checklist practical and repeatable for outreach operations.
create or replace function public.ensure_daily_checklist()
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_any_role(array['admin','coordinator']::public.app_role[]) then
    raise exception 'Only admins or coordinators can create the daily checklist';
  end if;
  insert into public.daily_tasks(task_date,title,category) values
    (current_date,'Review campaign priorities and team updates','Daily operations'),
    (current_date,'Morning briefing and team roll-call','Daily operations'),
    (current_date,'Check sponsor updates and outstanding pledges','Finance'),
    (current_date,'Call assigned students and record outcomes','Student outreach'),
    (current_date,'Visit assigned student hostels and update visit status','Student outreach'),
    (current_date,'Check faculty, department and student availability','Student outreach'),
    (current_date,'Follow up with volunteers and station coordinators','Team coordination'),
    (current_date,'Review flyer distribution and campaign materials','Publicity'),
    (current_date,'Confirm transport and logistics requirements','Logistics'),
    (current_date,'Review polling-agent assignments and readiness','Station readiness'),
    (current_date,'Check volunteer attendance and coverage gaps','Team coordination'),
    (current_date,'Confirm finance and expenditure updates','Finance'),
    (current_date,'Review logistics and staffing risks for the day','Logistics'),
    (current_date,'Submit the end-of-day progress report','Evening review'),
    (current_date,'Log incidents and escalate urgent issues','Risk review'),
    (current_date,'Close out the day and plan tomorrow''s priorities','Evening review'),
    (current_date,'End-of-day notes','Evening review')
  on conflict(task_date,title) do nothing;
end; $$;

-- Additional operations registers for a complete shared command centre.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(), full_name text not null,
  role text not null default 'Volunteer', team_area text, contact text,
  status text not null default 'Active', created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.transport_requests (
  id uuid primary key default gen_random_uuid(), purpose text not null,
  requester text, destination text not null, request_date date,
  people_count integer not null default 0 check(people_count>=0),
  estimated_cost numeric(12,2) not null default 0 check(estimated_cost>=0),
  approved_cost numeric(12,2) not null default 0 check(approved_cost>=0),
  paid_cost numeric(12,2) not null default 0 check(paid_cost>=0),
  status text not null default 'Requested', notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), title text not null,
  station text not null, priority text not null default 'Normal',
  reported_by text, assigned_to text, status text not null default 'Open',
  details text not null, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['team_members','transport_requests','incidents'] LOOP
  EXECUTE format('alter table public.%I enable row level security',t);
  EXECUTE format('drop policy if exists operations_read on public.%I',t);
  EXECUTE format('create policy operations_read on public.%I for select to authenticated using (public.has_any_role(array[''admin'',''finance'',''coordinator'',''viewer'']::public.app_role[]))',t);
  EXECUTE format('drop policy if exists operations_write on public.%I',t);
  EXECUTE format('create policy operations_write on public.%I for all to authenticated using (public.has_any_role(array[''admin'',''finance'',''coordinator'']::public.app_role[])) with check (public.has_any_role(array[''admin'',''finance'',''coordinator'']::public.app_role[]))',t);
  EXECUTE format('grant select,insert,update,delete on public.%I to authenticated',t);
END LOOP; END $$;
