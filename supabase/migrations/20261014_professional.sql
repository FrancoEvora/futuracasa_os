create table public.fc3_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 slug text unique not null check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
 name text not null check(length(name) between 2 and 100),
 role text not null default 'corretor' check(role in ('corretor','indicador')),
 bio text not null default '' check(length(bio)<=1600),
 city text not null default '' check(length(city)<=100),
 creci text not null default '' check(length(creci)<=50),
 phone text not null default '' check(length(phone)<=22),
 instagram text not null default '' check(length(instagram)<=160),
 photo_url text not null default '' check(photo_url='' or photo_url ~ '^https://'),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 check(not published or (length(phone)>=10 and (role='indicador' or length(creci)>=4)))
);
alter table public.fc3_profiles enable row level security;
create policy fc3_profiles_read on public.fc3_profiles for select to anon,authenticated using(published or id=(select auth.uid()));
create policy fc3_profiles_insert on public.fc3_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy fc3_profiles_update on public.fc3_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select on public.fc3_profiles to anon, authenticated;
grant insert,update on public.fc3_profiles to authenticated;

create table public.fc3_contacts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 name text not null check(length(name) between 2 and 100),
 phone text not null default '' check(length(phone)<=30),
 email text not null default '' check(length(email)<=160),
 project text not null default '' check(length(project)<=200),
 stage text not null default 'novo' check(stage in ('novo','contato','qualificado','visita','proposta','ganho','perdido')),
 notes text not null default '' check(length(notes)<=5000),
 next_action text not null default '' check(length(next_action)<=300),
 next_date date,
 source text not null default 'Cadastro próprio' check(length(source)<=200),
 created_at timestamptz not null default now()
);
alter table public.fc3_contacts enable row level security;
create policy fc3_contacts_own on public.fc3_contacts for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant select,insert,update,delete on public.fc3_contacts to authenticated;
create index fc3_contacts_owner on public.fc3_contacts(owner_id,created_at desc);

create table public.fc3_drafts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check(length(title) between 1 and 200),
 body text not null check(length(body)<=12000),
 channel text not null default 'Instagram' check(length(channel)<=50),
 planned_for date,
 status text not null default 'rascunho' check(status in ('rascunho','aprovado','publicado_manualmente')),
 created_at timestamptz not null default now()
);
alter table public.fc3_drafts enable row level security;
create policy fc3_drafts_own on public.fc3_drafts for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant select,insert,update,delete on public.fc3_drafts to authenticated;
create index fc3_drafts_owner on public.fc3_drafts(owner_id,created_at desc);

create table public.fc3_posts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.fc3_profiles(id) on delete cascade default auth.uid(),
 topic text not null check(topic in ('Mercado local','Parcerias','Conteúdo e vendas','Dúvidas')),
 body text not null check(length(body) between 10 and 3000),
 created_at timestamptz not null default now()
);
alter table public.fc3_posts enable row level security;
create policy fc3_posts_read on public.fc3_posts for select to authenticated using(true);
create policy fc3_posts_insert on public.fc3_posts for insert to authenticated with check(author_id=(select auth.uid()) and exists(select 1 from public.fc3_profiles p where p.id=auth.uid()) and (select count(*) from public.fc3_posts p where p.author_id=auth.uid() and p.created_at>now()-interval '1 hour')<10);
create policy fc3_posts_delete on public.fc3_posts for delete to authenticated using(author_id=(select auth.uid()));
grant select,insert,delete on public.fc3_posts to authenticated;

create or replace function public.fc3_inquiry(p_slug text,p_name text,p_phone text,p_project text,p_consent boolean,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare broker uuid; existing public.fc3_contacts; begin
 if p_consent is distinct from true or length(trim(p_name)) not between 2 and 100 or p_phone !~ '^[0-9+() -]{10,22}$' or length(coalesce(p_project,''))>200 or p_request is null then raise exception 'Confira o nome, telefone e autorização.'; end if;
 select id into broker from public.fc3_profiles where slug=p_slug and published and role='corretor';
 if broker is null then raise exception 'Página profissional indisponível.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(broker::text,0));
 select * into existing from public.fc3_contacts where id=p_request;
 if found then
  if existing.owner_id=broker and existing.name=trim(p_name) and existing.phone=p_phone then return p_request; end if;
  raise exception 'Identificador inválido.';
 end if;
 if (select count(*) from public.fc3_contacts where owner_id=broker and source='Landing page • consentimento registrado' and created_at>now()-interval '1 hour')>=30 then raise exception 'Muitas solicitações. Tente mais tarde.'; end if;
 insert into public.fc3_contacts(id,owner_id,name,phone,project,source)
 values(p_request,broker,trim(p_name),p_phone,coalesce(p_project,''),'Landing page • consentimento registrado');
 return p_request;
end $$;
revoke all on function public.fc3_inquiry(text,text,text,text,boolean,uuid) from public;
grant execute on function public.fc3_inquiry(text,text,text,text,boolean,uuid) to anon,authenticated;
