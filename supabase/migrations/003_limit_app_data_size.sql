-- One account = one jsonb row, so cap its size (about 5 MB) to stop a single user from storing huge payloads.
alter table public.user_app_data
  add constraint user_app_data_size_limit check (pg_column_size(data) < 5000000);
