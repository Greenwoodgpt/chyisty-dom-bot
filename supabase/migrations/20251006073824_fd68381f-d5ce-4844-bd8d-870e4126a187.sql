-- Add rating fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add rating fields to provider profiles
ALTER TABLE public.tg_user_profile 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create table for admin settings
CREATE TABLE IF NOT EXISTS public.bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access for edge functions
CREATE POLICY "bot_settings_all_access" ON public.bot_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);