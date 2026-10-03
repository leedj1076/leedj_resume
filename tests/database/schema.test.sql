-- Runs in two disposable PostgreSQL databases after migrations 001 + 002.
-- :is_adoption=true/false; psql exits on any assertion failure.
do $$
declare
  app_table text;
  app_sequence text;
  rpc_signature text;
  public_role text;
  privilege text;
  rls_enabled boolean;
begin
  foreach app_table in array array['app_settings', 'analytics_events', 'chat_exchanges'] loop
    select c.relrowsecurity into rls_enabled
      from pg_class c where c.oid = format('public.%I', app_table)::regclass;
    if rls_enabled is distinct from true then
      raise exception 'RLS is not enabled on %', app_table;
    end if;
    foreach public_role in array array['anon', 'authenticated'] loop
      foreach privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(public_role, format('public.%I', app_table), privilege) then
          raise exception '% has forbidden % on %', public_role, privilege, app_table;
        end if;
      end loop;
    end loop;
    foreach privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if not has_table_privilege('service_role', format('public.%I', app_table), privilege) then
        raise exception 'service_role lacks % on %', privilege, app_table;
      end if;
    end loop;
  end loop;

  foreach app_sequence in array array['analytics_events_id_seq', 'chat_exchanges_id_seq'] loop
    foreach public_role in array array['anon', 'authenticated'] loop
      foreach privilege in array array['USAGE', 'SELECT', 'UPDATE'] loop
        if has_sequence_privilege(public_role, format('public.%I', app_sequence), privilege) then
          raise exception '% has forbidden % on %', public_role, privilege, app_sequence;
        end if;
      end loop;
    end loop;
    foreach privilege in array array['USAGE', 'SELECT'] loop
      if not has_sequence_privilege('service_role', format('public.%I', app_sequence), privilege) then
        raise exception 'service_role lacks % on %', privilege, app_sequence;
      end if;
    end loop;
    if has_sequence_privilege('service_role', format('public.%I', app_sequence), 'UPDATE') then
      raise exception 'service_role has unneeded UPDATE on %', app_sequence;
    end if;
  end loop;

  foreach rpc_signature in array array[
    'public.claim_correction_review(integer,text,text,text,text,timestamptz)',
    'public.finish_correction_review(integer,text,text,text,text)',
    'public.record_uncertain_correction_review(integer,text,text)'
  ] loop
    foreach public_role in array array['anon', 'authenticated'] loop
      if has_function_privilege(public_role, rpc_signature, 'EXECUTE') then
        raise exception '% can execute %', public_role, rpc_signature;
      end if;
    end loop;
    if not has_function_privilege('service_role', rpc_signature, 'EXECUTE') then
      raise exception 'service_role cannot execute %', rpc_signature;
    end if;
  end loop;
end $$;

\if :{?is_adoption}
\else
  \echo 'is_adoption is required'
  \quit 1
\endif

\if :is_adoption
do $$
begin
  if (select correction_status from public.chat_exchanges where id = 1) <> 'applied'
     or (select correction_status from public.chat_exchanges where id = 2) <> 'pending'
     or (select correction_status from public.chat_exchanges where id = 3) <> 'none' then
    raise exception 'Existing correction state was not adopted';
  end if;
end $$;
\endif

insert into public.chat_exchanges
  (session_id, persona, focus, lang, query, response)
values ('sql-test', 'recruiter', 'full_stack', 'en', 'Test claim?', 'Test answer');

do $$
declare
  exchange_id integer := (select max(id) from public.chat_exchanges);
  claimed public.chat_exchanges;
  result public.chat_exchanges;
begin
  claimed := public.claim_correction_review(exchange_id, 'owner-one', 'needs_improvement', 'More detail', 'New answer', now());
  if claimed is null or claimed.correction_status <> 'pending' or claimed.improvement_text <> 'New answer'
     or claimed.correction_owner_token <> 'owner-one' or claimed.dj_rating <> 'needs_improvement' then
    raise exception 'Claim did not save review and pending state atomically';
  end if;
  result := public.claim_correction_review(exchange_id, 'owner-two', 'good', null, 'Overwritten', now());
  if result is not null or (select improvement_text from public.chat_exchanges where id = exchange_id) <> 'New answer' then
    raise exception 'Overlapping claim changed the pending review';
  end if;
  result := public.finish_correction_review(exchange_id, 'owner-two', 'applied', 'wrong-owner', null);
  if result is not null then raise exception 'Wrong owner finalized correction'; end if;
  result := public.record_uncertain_correction_review(exchange_id, 'owner-one', 'provider state unknown');
  if result.correction_status <> 'failed' or result.correction_owner_token <> 'owner-one' then
    raise exception 'Uncertain upsert did not retain claim';
  end if;
  result := public.finish_correction_review(exchange_id, 'owner-one', 'applied', 'dj-correction-test', null);
  if result.correction_status <> 'applied' or result.correction_owner_token is not null
     or result.pinecone_chunk_id <> 'dj-correction-test' or result.correction_error is not null then
    raise exception 'Owner completion did not finalize state';
  end if;
end $$;

insert into public.chat_exchanges
  (session_id, persona, focus, lang, query, response)
values ('sql-test', 'recruiter', 'full_stack', 'en', 'Test retry?', 'Test answer');
do $$
declare
  exchange_id integer := (select max(id) from public.chat_exchanges);
  result public.chat_exchanges;
begin
  result := public.claim_correction_review(exchange_id, 'owner-a', 'needs_improvement', null, 'Retry answer', now());
  result := public.finish_correction_review(exchange_id, 'owner-a', 'failed', null, 'embedding failed');
  if result.correction_owner_token is not null or result.correction_status <> 'failed' then
    raise exception 'Prevector failure did not release claim';
  end if;
  result := public.claim_correction_review(exchange_id, 'owner-b', 'needs_improvement', null, null, now());
  if result.correction_status <> 'pending' or result.improvement_text <> 'Retry answer' then
    raise exception 'Failed correction could not be retried';
  end if;
  result := public.finish_correction_review(exchange_id, 'owner-b', null, null, null);
  if result.correction_owner_token is not null or result.correction_status <> 'pending' then
    raise exception 'Conditional release lost saved pending correction';
  end if;
end $$;
