-- 1. Enable RLS pada tabel bookings (jika belum)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 2. Policy untuk melihat booking sendiri
-- Memungkinkan user untuk melihat data booking yang memiliki user_id sama dengan ID mereka
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings 
FOR SELECT USING (auth.uid() = user_id);

-- 3. Policy untuk membuat booking (insert)
-- Memungkinkan user untuk membuat booking baru atas nama mereka sendiri
DROP POLICY IF EXISTS "Users can create their own bookings" ON bookings;
CREATE POLICY "Users can create their own bookings" ON bookings 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Policy untuk update (pembayaran)
-- Memungkinkan user untuk memperbarui status booking mereka sendiri (misal: saat konfirmasi pembayaran)
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings 
FOR UPDATE USING (auth.uid() = user_id);

-- 5. Enable RLS pada tabel payments (jika belum)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 6. Policy untuk melihat payment sendiri
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = payments.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- 7. Policy untuk membuat payment sendiri
DROP POLICY IF EXISTS "Users can create their own payments" ON payments;
CREATE POLICY "Users can create their own payments" ON payments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = payments.booking_id
    AND bookings.user_id = auth.uid()
  )
);
