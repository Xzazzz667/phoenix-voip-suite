-- Table pour les numéros SDA disponibles à la commande
CREATE TABLE public.available_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  region TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'SDA',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'ordered')),
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.available_numbers ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (numéros disponibles visibles par tous)
CREATE POLICY "Anyone can view available numbers"
ON public.available_numbers
FOR SELECT
USING (status = 'available');

-- Politique pour les utilisateurs authentifiés de voir tous les numéros
CREATE POLICY "Authenticated users can view all numbers"
ON public.available_numbers
FOR SELECT
TO authenticated
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_available_numbers_updated_at
BEFORE UPDATE ON public.available_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_available_numbers_status ON public.available_numbers(status);
CREATE INDEX idx_available_numbers_region ON public.available_numbers(region);
CREATE INDEX idx_available_numbers_numero ON public.available_numbers(numero);