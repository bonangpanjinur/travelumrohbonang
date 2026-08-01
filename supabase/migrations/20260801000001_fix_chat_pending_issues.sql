-- 1. Perubahan tipe data user_id dari TEXT ke UUID pada tabel conversations
-- Melakukan casting eksplisit agar data yang ada tidak hilang
ALTER TABLE public.conversations 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ALTER COLUMN assigned_admin_id TYPE uuid USING assigned_admin_id::uuid;

-- 2. Perubahan tipe data sender_id pada tabel conversation_messages
ALTER TABLE public.conversation_messages
  ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

-- 3. Optimasi RLS untuk conversation_messages
-- Mengganti EXISTS dengan JOIN atau pengecekan langsung jika memungkinkan untuk performa lebih baik
-- Namun karena RLS bekerja per baris, kita pastikan index pada conversation_id sudah ada (sudah ada di skema sebelumnya)

DROP POLICY IF EXISTS "conv_messages_select_own_or_admin" ON public.conversation_messages;

CREATE POLICY "conv_messages_select_own_or_admin"
  ON public.conversation_messages
  FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND public.is_admin(auth.uid()))
    OR
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE 
        (auth.role() = 'authenticated' AND user_id = auth.uid())
        OR
        (auth.role() = 'anon' AND guest_token = current_setting('request.headers', true)::json->>'x-guest-token')
    )
  );

-- Catatan: PostgreSQL sering mengoptimalkan IN (subquery) lebih baik daripada EXISTS dalam beberapa konteks RLS, 
-- tapi yang terpenting adalah konsistensi tipe data UUID yang sekarang sudah sama dengan auth.uid()
