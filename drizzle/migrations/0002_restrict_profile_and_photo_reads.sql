DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable own" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "item photos readable by authenticated" ON storage.objects;
CREATE POLICY "item photos readable by owners or listed items" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.items AS i
      WHERE i.image_url = storage.objects.name
    )
  )
);