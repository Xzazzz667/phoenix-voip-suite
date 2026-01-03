-- Table pour les demandes d'autorisation de numéros
CREATE TABLE public.number_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  document_urls TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.number_authorizations ENABLE ROW LEVEL SECURITY;

-- Anyone can create authorization requests (public form)
CREATE POLICY "Anyone can create authorization requests"
ON public.number_authorizations
FOR INSERT
WITH CHECK (true);

-- Anyone can view their own requests by email
CREATE POLICY "Anyone can view authorization requests"
ON public.number_authorizations
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_number_authorizations_updated_at
BEFORE UPDATE ON public.number_authorizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_number_authorizations_status ON public.number_authorizations(status);
CREATE INDEX idx_number_authorizations_numero ON public.number_authorizations(numero);

-- Storage bucket for authorization documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'authorization-documents',
  'authorization-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies
CREATE POLICY "Anyone can upload authorization documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'authorization-documents');

CREATE POLICY "Service role can read authorization documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'authorization-documents');