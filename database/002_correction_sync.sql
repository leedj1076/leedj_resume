-- Apply to a compatible chat_exchanges table after reviewing the live schema.
begin;

alter table public.chat_exchanges
  add column correction_status text not null default 'none'
    check (correction_status in ('none', 'pending', 'applied', 'failed')),
  add column correction_error text,
  add column correction_owner_token text,
  add column correction_claimed_at timestamptz,
  add constraint correction_claim_pair check
    ((correction_owner_token is null) = (correction_claimed_at is null));

-- Existing correction IDs indicate a completed upsert under the earlier review flow.
-- Saved text without an ID may have failed to index and remains retryable.
update public.chat_exchanges
set correction_status = case
  when pinecone_chunk_id is not null then 'applied'
  when nullif(btrim(improvement_text), '') is not null then 'pending'
  else 'none'
end;

-- One atomic claim both saves the review intent and excludes overlapping writers.
-- The claim does not expire automatically: an old Pinecone upsert cannot be fenced.
create function public.claim_correction_review(
  p_exchange_id integer,
  p_owner_token text,
  p_rating text,
  p_comment text,
  p_improvement_text text,
  p_reviewed_at timestamptz
) returns public.chat_exchanges
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  claimed public.chat_exchanges;
  has_new_text boolean := nullif(btrim(p_improvement_text), '') is not null;
begin
  if nullif(p_owner_token, '') is null then
    raise exception 'Review owner token is required';
  end if;

  update public.chat_exchanges as e
  set correction_owner_token = p_owner_token,
      correction_claimed_at = now(),
      dj_rating = p_rating,
      dj_comment = nullif(p_comment, ''),
      reviewed_at = p_reviewed_at,
      improvement_text = case when has_new_text then p_improvement_text else e.improvement_text end,
      correction_status = case
        when has_new_text or (e.correction_status in ('pending', 'failed') and nullif(btrim(e.improvement_text), '') is not null) then 'pending'
        when e.correction_status in ('pending', 'failed') then 'none'
        else e.correction_status
      end,
      correction_error = case
        when has_new_text or e.correction_status in ('pending', 'failed') then null
        else e.correction_error
      end,
      pinecone_chunk_id = case
        when has_new_text or e.correction_status in ('pending', 'failed') then null
        else e.pinecone_chunk_id
      end
  where e.id = p_exchange_id and e.correction_owner_token is null
  returning e.* into claimed;

  return claimed;
end;
$$;

-- Completion and release are fenced by the exact owner that claimed the row.
create function public.finish_correction_review(
  p_exchange_id integer,
  p_owner_token text,
  p_status text,
  p_chunk_id text,
  p_error text
) returns public.chat_exchanges
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  finished public.chat_exchanges;
begin
  if p_status is not null and p_status not in ('applied', 'failed') then
    raise exception 'Invalid correction completion status';
  end if;
  if p_status = 'applied' and nullif(p_chunk_id, '') is null then
    raise exception 'Applied correction requires a chunk ID';
  end if;

  update public.chat_exchanges as e
  set correction_owner_token = null,
      correction_claimed_at = null,
      correction_status = coalesce(p_status, e.correction_status),
      correction_error = case
        when p_status = 'applied' then null
        when p_status = 'failed' then p_error
        else e.correction_error
      end,
      pinecone_chunk_id = case when p_status = 'applied' then p_chunk_id else e.pinecone_chunk_id end
  where e.id = p_exchange_id and e.correction_owner_token = p_owner_token
  returning e.* into finished;

  return finished;
end;
$$;

revoke all on function public.claim_correction_review(integer, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_correction_review(integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_correction_review(integer, text, text, text, text, timestamptz) to service_role;
grant execute on function public.finish_correction_review(integer, text, text, text, text) to service_role;

commit;
