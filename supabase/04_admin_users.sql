-- ============================================================
-- E-SERIKALI MTAA — ADMIN & STAFF USER SETUP
-- Run this in Supabase SQL Editor AFTER the auth users exist.
-- These UUIDs must already exist in auth.users.
-- ============================================================

INSERT INTO public.users (
    id, first_name, last_name, email, phone, role,
    region, district, ward, street,
    is_verified, account_status
) VALUES
(
    '92d16a1b-9f9f-43cc-bab2-550b655128c1',
    'Mbaza', 'Codes',
    'mbazzacodes@gmail.com', '',
    'admin',
    'Dar es Salaam', 'Kinondoni', '', '',
    true, 'active'
),
(
    '116b29bc-9845-4259-b9cf-0fb95061af8a',
    'Mbazza', 'David',
    'mbazzadavid@yahoo.com', '',
    'staff',
    'Dar es Salaam', 'Kinondoni', '', '',
    true, 'active'
)
ON CONFLICT (id) DO UPDATE SET
    role           = EXCLUDED.role,
    is_verified    = EXCLUDED.is_verified,
    account_status = EXCLUDED.account_status,
    email          = EXCLUDED.email;
