CREATE OR REPLACE FUNCTION public.get_user_simple_tasks()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  title text,
  is_completed boolean,
  start_date date,
  due_date date,
  owner_email text,
  assigned_to_user_id uuid,
  assigned_to_email text,
  shared_with json,
  description text,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  WITH shares_agg AS (
    SELECT
      ts.task_id,
      json_agg(json_build_object('user_id', ts.shared_with_user_id, 'email', u.email)) as shared_with_info
    FROM public.task_shares ts
    JOIN auth.users u ON ts.shared_with_user_id = u.id
    GROUP BY ts.task_id
  )
  SELECT
    st.id,
    st.user_id,
    st.created_at,
    st.title,
    st.is_completed,
    st.start_date,
    st.due_date,
    owner.email::text as owner_email,
    st.assigned_to_user_id,
    assignee.email::text as assigned_to_email,
    sa.shared_with_info as shared_with,
    st.description,
    st.status
  FROM public.simple_tasks st
  LEFT JOIN auth.users as owner ON st.user_id = owner.id
  LEFT JOIN auth.users as assignee ON st.assigned_to_user_id = assignee.id
  LEFT JOIN shares_agg sa ON st.id = sa.task_id
  WHERE
    st.user_id = auth.uid()
    OR st.assigned_to_user_id = auth.uid()
    OR st.id IN (SELECT task_id FROM public.task_shares WHERE shared_with_user_id = auth.uid());
END;
$$;
