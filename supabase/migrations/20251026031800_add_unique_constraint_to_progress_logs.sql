ALTER TABLE public.progress_logs
ADD CONSTRAINT progress_logs_habit_task_id_completion_date_user_id_key 
UNIQUE (habit_task_id, completion_date, user_id);