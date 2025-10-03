-- Add city to provider profiles
ALTER TABLE public.tg_user_profile 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add photo URLs to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS photo_door TEXT,
ADD COLUMN IF NOT EXISTS photo_bin TEXT;

-- Create storage bucket for order photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order photos
CREATE POLICY "Anyone can view order photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-photos');

CREATE POLICY "Authenticated users can upload order photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own order photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'order-photos')
WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Users can delete order photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-photos');