-- Add notification and schedule fields to provider profiles
ALTER TABLE public.tg_user_profile 
ADD COLUMN IF NOT EXISTS notification_filter TEXT DEFAULT 'filter_all',
ADD COLUMN IF NOT EXISTS schedule_days TEXT,
ADD COLUMN IF NOT EXISTS schedule_time TEXT;