-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.area_prks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  life_prk_id uuid NOT NULL,
  title text NOT NULL,
  target_value integer NOT NULL DEFAULT 100,
  current_value integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '%'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  description text,
  user_id uuid NOT NULL,
  group_id uuid,
  CONSTRAINT area_prks_pkey PRIMARY KEY (id),
  CONSTRAINT area_prks_life_prk_id_fkey FOREIGN KEY (life_prk_id) REFERENCES public.life_prks(id),
  CONSTRAINT area_prks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT area_prks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.daily_progress_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  progress_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT daily_progress_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT daily_progress_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.emotional_pulses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pulse_date date NOT NULL,
  emotional_state_tag text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emotional_pulses_pkey PRIMARY KEY (id),
  CONSTRAINT emotional_pulses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (user_id, group_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.habit_task_area_prk_links (
  habit_task_id uuid NOT NULL,
  area_prk_id uuid NOT NULL,
  CONSTRAINT habit_task_area_prk_links_pkey PRIMARY KEY (area_prk_id, habit_task_id),
  CONSTRAINT habit_task_area_prk_links_area_prk_id_fkey FOREIGN KEY (area_prk_id) REFERENCES public.area_prks(id),
  CONSTRAINT habit_task_area_prk_links_habit_task_id_fkey FOREIGN KEY (habit_task_id) REFERENCES public.habit_tasks(id)
);
CREATE TABLE public.habit_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['habit'::text, 'project'::text, 'task'::text])),
  start_date date NOT NULL DEFAULT now(),
  due_date date,
  completion_date date,
  frequency text CHECK (frequency = ANY (ARRAY['daily'::text, 'specific_days'::text, 'every_x_days'::text, 'every_x_weeks'::text, 'every_x_months'::text, 'specific_day_of_month'::text, 'weekly'::text, 'monthly'::text])),
  frequency_days ARRAY,
  weight integer NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 5),
  is_critical boolean NOT NULL DEFAULT false,
  measurement_type text CHECK (measurement_type = ANY (ARRAY['binary'::text, 'quantitative'::text, 'temporal'::text])),
  measurement_goal jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  user_id uuid NOT NULL,
  display_order integer,
  group_id uuid,
  frequency_unit text,
  frequency_interval integer,
  frequency_day_of_month integer,
  description text,
  CONSTRAINT habit_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT habit_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT habit_tasks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.life_prks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL,
  group_id uuid,
  color_theme text DEFAULT 'mint'::text,
  CONSTRAINT life_prks_pkey PRIMARY KEY (id),
  CONSTRAINT life_prks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT life_prks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.progress_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  habit_task_id uuid NOT NULL,
  completion_date date NOT NULL,
  progress_value numeric,
  completion_percentage numeric NOT NULL DEFAULT 1.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT progress_logs_pkey PRIMARY KEY (id),
  CONSTRAINT progress_logs_habit_task_id_fkey FOREIGN KEY (habit_task_id) REFERENCES public.habit_tasks(id),
  CONSTRAINT progress_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.simple_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  start_date date,
  due_date date,
  assigned_to_user_id uuid,
  CONSTRAINT simple_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT simple_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT simple_tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.task_shares (
  task_id uuid NOT NULL,
  shared_with_user_id uuid NOT NULL,
  shared_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_shares_pkey PRIMARY KEY (shared_with_user_id, task_id),
  CONSTRAINT task_shares_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.simple_tasks(id),
  CONSTRAINT task_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES auth.users(id),
  CONSTRAINT task_shares_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES auth.users(id)
);