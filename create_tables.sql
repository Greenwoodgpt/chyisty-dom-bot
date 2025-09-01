-- Создание таблицы заказов
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL, -- Telegram User ID
  chat_id BIGINT NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  address TEXT NOT NULL,
  size_option VARCHAR(50) NOT NULL, -- 'one_bag', 'two_bags', 'three_bags'
  time_option VARCHAR(100) NOT NULL,
  custom_time TEXT,
  amount INTEGER NOT NULL, -- Сумма в копейках
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'paid', 'in_work', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы состояний пользователей
CREATE TABLE IF NOT EXISTS public.tg_user_state (
  user_id BIGINT PRIMARY KEY, -- Telegram User ID
  state VARCHAR(50) NOT NULL DEFAULT 'start', -- 'start', 'awaiting_address', 'awaiting_size', 'awaiting_time', 'awaiting_confirmation'
  temp_data JSONB DEFAULT '{}', -- Временные данные для текущего заказа
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tg_user_state ENABLE ROW LEVEL SECURITY;

-- Политики для Edge Functions (полный доступ)
CREATE POLICY "orders_all_access" ON public.orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tg_user_state_all_access" ON public.tg_user_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);