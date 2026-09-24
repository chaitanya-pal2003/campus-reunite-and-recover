CREATE POLICY "item photos readable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'item-photos');
CREATE POLICY "item photos upload own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item photos delete own folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
