-- Удаляем старый constraint на статус
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Добавляем новый constraint с расширенным списком статусов
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled', 'paid', 'in_work'));