insert into storage.buckets (id, name, public) values ('lesson-content', 'lesson-content', true) on conflict (id) do nothing;

create policy "Public read lesson content"
on storage.objects for select
using (bucket_id = 'lesson-content');

create policy "Instructors can upload lesson content"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-content' and has_role(auth.uid(), 'instructor'::app_role));

create policy "Instructors can update own lesson content"
on storage.objects for update
to authenticated
using (bucket_id = 'lesson-content' and owner = auth.uid());

create policy "Instructors can delete own lesson content"
on storage.objects for delete
to authenticated
using (bucket_id = 'lesson-content' and owner = auth.uid());