-- Apply to a compatible chat_exchanges table after reviewing the live schema.
begin;

alter table public.chat_exchanges
  add column correction_status text not null default 'none'
    check (correction_status in ('none', 'pending', 'applied', 'failed')),
  add column correction_error text;

-- Existing correction IDs indicate a completed upsert under the earlier review flow.
-- Saved text without an ID may have failed to index and remains retryable.
update public.chat_exchanges
set correction_status = case
  when pinecone_chunk_id is not null then 'applied'
  when nullif(btrim(improvement_text), '') is not null then 'pending'
  else 'none'
end;

commit;
