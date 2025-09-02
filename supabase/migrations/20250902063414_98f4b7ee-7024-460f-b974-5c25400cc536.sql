-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  address TEXT NOT NULL,
  size_option TEXT NOT NULL CHECK (size_option IN ('one_bag', 'two_bags', 'three_bags')),
  time_option TEXT NOT NULL CHECK (time_option IN ('within_hour', 'tomorrow_morning', 'custom')),
  custom_time TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_work', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tg_user_state table for Telegram bot state management
CREATE TABLE public.tg_user_state (
  user_id BIGINT NOT NULL PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'start',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (optional - you can disable if this is admin-only)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_user_state ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (allow all operations for now)
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on tg_user_state" ON public.tg_user_state FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tg_user_state_updated_at
  BEFORE UPDATE ON public.tg_user_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();