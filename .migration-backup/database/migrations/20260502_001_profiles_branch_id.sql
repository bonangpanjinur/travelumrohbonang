
-- Add branch_id to profiles for branch staff isolation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id uuid;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);

-- Link agents to auth user (for agent portal login)
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_referral_code ON public.agents(referral_code) WHERE referral_code IS NOT NULL;

-- Track agent on bookings (separate from PIC pusat)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS agent_id uuid;
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON public.bookings(agent_id);

-- Helper: get user's branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT branch_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Helper: check if user is an agent and return agent_id
CREATE OR REPLACE FUNCTION public.get_agent_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.agents WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS: branch managers can view bookings for their branch
DROP POLICY IF EXISTS "Branch managers view branch bookings" ON public.bookings;
CREATE POLICY "Branch managers view branch bookings"
ON public.bookings FOR SELECT
USING (
  has_role(auth.uid(), 'branch_manager')
  AND branch_id IS NOT NULL
  AND branch_id = public.get_user_branch_id(auth.uid())
);

-- RLS: agents can view their referred bookings
DROP POLICY IF EXISTS "Agents view own referred bookings" ON public.bookings;
CREATE POLICY "Agents view own referred bookings"
ON public.bookings FOR SELECT
USING (
  agent_id IS NOT NULL
  AND agent_id = public.get_agent_id_for_user(auth.uid())
);

-- Agents can view their own agent record
DROP POLICY IF EXISTS "Agents view own profile" ON public.agents;
CREATE POLICY "Agents view own profile"
ON public.agents FOR SELECT
USING (user_id = auth.uid());
