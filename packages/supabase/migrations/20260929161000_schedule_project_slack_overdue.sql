create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'project-slack-overdue-every-10-minutes';

select cron.schedule(
  'project-slack-overdue-every-10-minutes',
  '*/10 * * * *',
  $$
    select net.http_post(
      url := 'https://oehqusxpbwtbeenzixjh.supabase.co/functions/v1/project-slack-overdue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHF1c3hwYnd0YmVlbnppeGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTMyMjYsImV4cCI6MjA2NjAyOTIyNn0.isR50QQx5LrTxXbE7hpFVa3DSR5NLj9rX2ZyEsLWnHU'
      ),
      body := '{}'::jsonb
    );
  $$
);
