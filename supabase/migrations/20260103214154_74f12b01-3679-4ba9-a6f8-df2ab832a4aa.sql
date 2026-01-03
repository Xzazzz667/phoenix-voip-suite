-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload authorization documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view authorization documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read authorization documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete authorization documents" ON storage.objects;

-- Recreate storage policies with correct configuration
CREATE POLICY "Authenticated users can upload authorization documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'authorization-documents');

CREATE POLICY "Authenticated users can view authorization documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'authorization-documents');

CREATE POLICY "Authenticated users can delete authorization documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'authorization-documents');

CREATE POLICY "Authenticated users can update authorization documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'authorization-documents');