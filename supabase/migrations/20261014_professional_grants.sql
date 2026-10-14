revoke all on public.fc3_profiles,public.fc3_contacts,public.fc3_drafts,public.fc3_posts from anon,authenticated;
grant select on public.fc3_profiles to anon,authenticated;
grant insert,update on public.fc3_profiles to authenticated;
grant select,insert,update,delete on public.fc3_contacts,public.fc3_drafts to authenticated;
grant select,insert,delete on public.fc3_posts to authenticated;
