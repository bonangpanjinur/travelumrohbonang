ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill branch_id from agent's branch for existing bookings
UPDATE public.bookings b
SET branch_id = a.branch_id
FROM public.agents a
WHERE b.pic_type = 'agent' AND b.pic_id = a.id AND a.branch_id IS NOT NULL AND b.branch_id IS NULL;