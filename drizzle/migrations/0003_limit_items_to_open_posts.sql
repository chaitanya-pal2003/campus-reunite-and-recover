DROP POLICY IF EXISTS "items readable" ON public.items;
CREATE POLICY "open items and own posts readable" ON public.items
FOR SELECT TO public
USING (status = 'open' OR auth.uid() = user_id);