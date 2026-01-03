-- Fix PUBLIC_DATA_EXPOSURE: Restrict number_authorizations access to authenticated users only

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view authorization requests" ON public.number_authorizations;
DROP POLICY IF EXISTS "Anyone can create authorization requests" ON public.number_authorizations;

-- Create restricted policies for authenticated users
CREATE POLICY "Authenticated users can view authorization requests"
ON public.number_authorizations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create authorization requests"
ON public.number_authorizations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update authorization requests"
ON public.number_authorizations
FOR UPDATE
TO authenticated
USING (true);

-- Fix STORAGE_EXPOSURE: Restrict storage uploads to authenticated users

-- Drop overly permissive policy if it exists
DROP POLICY IF EXISTS "Anyone can upload authorization documents" ON storage.objects;

-- Create restricted upload policy for authenticated users
CREATE POLICY "Authenticated users can upload authorization documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'authorization-documents');

-- Allow authenticated users to view documents
CREATE POLICY "Authenticated users can view authorization documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'authorization-documents');