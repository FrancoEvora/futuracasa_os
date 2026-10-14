begin;
select set_config('fc3.qa_a',gen_random_uuid()::text,true),set_config('fc3.qa_b',gen_random_uuid()::text,true);
insert into auth.users(id,email,aud,role) values(current_setting('fc3.qa_a')::uuid,'fc3-qa-a@example.invalid','authenticated','authenticated'),(current_setting('fc3.qa_b')::uuid,'fc3-qa-b@example.invalid','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('fc3.qa_a'),true);
insert into public.fc3_profiles(id,slug,name,phone,creci,published) values(auth.uid(),'qa-'||substr(auth.uid()::text,1,8),'QA temporário','34900000000','TESTE-MG',true);
insert into public.fc3_contacts(name) values('QA privado');
insert into public.fc3_drafts(title,body) values('QA privado','Teste transacional');
insert into public.fc3_posts(topic,body) values('Dúvidas','Teste transacional da comunidade.');
do $$ begin if (select count(*) from public.fc3_contacts where owner_id=auth.uid())<>1 then raise exception 'Owner read failed'; end if; end $$;
select set_config('request.jwt.claim.sub',current_setting('fc3.qa_b'),true);
do $$ begin
if exists(select 1 from public.fc3_contacts where owner_id=current_setting('fc3.qa_a')::uuid) then raise exception 'Contact isolation failed'; end if;
if exists(select 1 from public.fc3_drafts where owner_id=current_setting('fc3.qa_a')::uuid) then raise exception 'Draft isolation failed'; end if;
begin insert into public.fc3_contacts(owner_id,name) values(current_setting('fc3.qa_a')::uuid,'Invalid owner');raise exception 'Write isolation failed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('fc3.qa_request',gen_random_uuid()::text,true);
set local role anon;
select public.fc3_inquiry('qa-'||substr(current_setting('fc3.qa_a'),1,8),'QA público','34911111111','Solaris',true,current_setting('fc3.qa_request')::uuid);
select public.fc3_inquiry('qa-'||substr(current_setting('fc3.qa_a'),1,8),'QA público','34911111111','Solaris',true,current_setting('fc3.qa_request')::uuid);
do $$ begin
begin perform 1 from public.fc3_contacts;raise exception 'Anonymous private read permitted';exception when insufficient_privilege then null;end;
begin perform public.fc3_inquiry('qa-'||substr(current_setting('fc3.qa_a'),1,8),'QA sem consentimento','34911111111','Solaris',false,gen_random_uuid());raise exception 'Consent bypass';exception when raise_exception then if sqlerrm='Consent bypass' then raise;end if;end;
end $$;
reset role;
do $$ begin if(select count(*) from public.fc3_contacts where id=current_setting('fc3.qa_request')::uuid)<>1 then raise exception 'Idempotency failed';end if;end $$;
rollback;
select 'PASS: owner access, cross-account isolation, community insert, anonymous private denial, public intake, consent, idempotency. All test data rolled back.' as result;
