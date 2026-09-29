insert into public.project_slack_notification_rules (account_id, channel_id)
select c.account_id, c.id
from public.project_slack_channels c
where c.enabled
  and not exists (
    select 1 from public.project_slack_notification_rules r where r.channel_id = c.id
  );

insert into public.project_slack_notification_rule_events (rule_id, event_key)
select r.id, e.event_key
from public.project_slack_notification_rules r
join public.project_slack_channel_events e on e.channel_id = r.channel_id and e.enabled
on conflict do nothing;

insert into public.project_slack_notification_rule_projects (rule_id, project_id)
select r.id, p.project_id
from public.project_slack_notification_rules r
join public.project_slack_channel_projects p on p.channel_id = r.channel_id
on conflict do nothing;
