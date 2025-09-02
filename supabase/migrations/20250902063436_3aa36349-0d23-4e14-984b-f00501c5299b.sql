-- Fix RLS policies to be more specific
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on tg_user_state" ON public.tg_user_state;

-- Create more specific policies for orders table
CREATE POLICY "Enable read access for all users" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.orders FOR DELETE USING (true);

-- Create more specific policies for tg_user_state table  
CREATE POLICY "Enable read access for all users" ON public.tg_user_state FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.tg_user_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.tg_user_state FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.tg_user_state FOR DELETE USING (true);