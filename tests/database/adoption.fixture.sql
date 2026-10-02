-- Compatible pre-002 installation with real saved review states.
insert into public.chat_exchanges
  (session_id, persona, focus, lang, query, response, improvement_text, pinecone_chunk_id)
values
  ('adopt-1', 'recruiter', 'full_stack', 'en', 'Existing indexed?', 'Yes', 'Corrected', 'dj-correction-1'),
  ('adopt-2', 'recruiter', 'full_stack', 'en', 'Existing pending?', 'Yes', 'Needs indexing', null),
  ('adopt-3', 'recruiter', 'full_stack', 'en', 'No correction?', 'Yes', null, null);
