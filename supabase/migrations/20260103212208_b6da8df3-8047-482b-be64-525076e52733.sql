-- Drop the restrictive policies and replace with permissive ones
DROP POLICY IF EXISTS "Anyone can view available numbers" ON available_numbers;
DROP POLICY IF EXISTS "Authenticated users can view all numbers" ON available_numbers;

-- Create proper permissive policies for SELECT
CREATE POLICY "Anyone can view available numbers" 
ON available_numbers 
FOR SELECT 
USING (status = 'available');

-- Allow authenticated users to view all numbers (for admin purposes)
CREATE POLICY "Authenticated users can view all numbers" 
ON available_numbers 
FOR SELECT 
TO authenticated
USING (true);

-- Allow service role to insert/update (for import function)
CREATE POLICY "Service role can insert numbers" 
ON available_numbers 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update numbers" 
ON available_numbers 
FOR UPDATE 
TO service_role
USING (true);