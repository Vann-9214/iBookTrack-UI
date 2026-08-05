-- ============================================================
-- Migration 015: Mismatch Info Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mismatch_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  
  ilms_title TEXT NOT NULL,          
  physical_title TEXT NOT NULL,      
  physical_author TEXT,              
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mismatch_info_book_id ON public.mismatch_info (book_id);
