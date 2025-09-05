-- Create user profile table for Telegram users
CREATE TABLE IF NOT EXISTS public.tg_user_profile (
  user_id BIGINT PRIMARY KEY,
  role TEXT, -- 'customer' | 'performer'
  saved_address TEXT,
  eco_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and open policies for Edge Functions
ALTER TABLE public.tg_user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tg_user_profile_all_access" ON public.tg_user_profile
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add new columns to orders for extended flow
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'comment'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN comment TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'bags'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN bags JSONB;
  END IF;
END $$;

-- Triggers to maintain updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tg_user_profile_updated_at'
  ) THEN
    CREATE TRIGGER update_tg_user_profile_updated_at
    BEFORE UPDATE ON public.tg_user_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tg_user_profile_role ON public.tg_user_profile(role);
