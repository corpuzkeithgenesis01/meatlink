-- Run this in Supabase SQL Editor.
-- The same browser can be used by a buyer and by a seller. One push
-- subscription (endpoint) therefore needs to be linked to more than one user.

alter table push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
alter table push_subscriptions add constraint push_subscriptions_endpoint_user_key
  unique (endpoint, user_id);
