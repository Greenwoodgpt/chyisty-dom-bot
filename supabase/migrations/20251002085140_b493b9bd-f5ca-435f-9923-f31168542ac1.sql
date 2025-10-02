-- Добавляем поле performer_id для связи заказа с исполнителем
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS performer_id BIGINT;

-- Добавляем индекс для быстрого поиска заказов исполнителя
CREATE INDEX IF NOT EXISTS idx_orders_performer_id ON public.orders(performer_id);