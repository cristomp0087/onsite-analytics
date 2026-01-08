-- ============================================
-- OnSite Analytics - Admin Users Table
-- ============================================
-- Execute no SQL Editor do Supabase
-- Esta tabela controla quem pode acessar o dashboard

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- admin | analyst | viewer
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can see all
CREATE POLICY "Admins can view all admin_users"
  ON public.admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.approved = true
    )
    OR user_id = auth.uid()
  );

-- Users can insert their own request
CREATE POLICY "Users can request access"
  ON public.admin_users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only admins can update (approve)
CREATE POLICY "Admins can approve users"
  ON public.admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.approved = true
    )
  );

-- ============================================
-- IMPORTANTE: Criar primeiro admin manualmente
-- ============================================
-- Depois de criar sua conta no dashboard, execute:
--
-- INSERT INTO public.admin_users (user_id, role, approved, approved_at)
-- SELECT id, 'admin', true, NOW()
-- FROM auth.users
-- WHERE email = 'SEU_EMAIL@AQUI.COM';
--
-- ============================================
