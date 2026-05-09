-- ============================================================
-- E-SERIKALI MTAA — FILE 3: SEED DATA
-- Service categories, Tanzania regions, Services, Demo users
-- Run AFTER 01_schema.sql and 02_rls.sql
-- ============================================================

-- ============================================================
-- SERVICE CATEGORIES
-- ============================================================

INSERT INTO public.service_categories (id, name, name_sw, description, icon, "order", active) VALUES
    (gen_random_uuid(), 'Vitambulisho',     'Vitambulisho',     'Huduma za vitambulisho vya mkazi',    'id-card',    1, true),
    (gen_random_uuid(), 'Sherehe',          'Sherehe',          'Vibali vya sherehe na matukio',       'calendar',   2, true),
    (gen_random_uuid(), 'Mazishi',          'Mazishi',          'Vibali vya mazishi',                  'heart',      3, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TANZANIA REGIONS (Top-level locations)
-- ============================================================

INSERT INTO public.locations (id, name, level, parent_id) VALUES
    ('00000001-0000-0000-0000-000000000001', 'Dar es Salaam', 'region', NULL),
    ('00000001-0000-0000-0000-000000000002', 'Mwanza',        'region', NULL),
    ('00000001-0000-0000-0000-000000000003', 'Arusha',        'region', NULL),
    ('00000001-0000-0000-0000-000000000004', 'Dodoma',        'region', NULL),
    ('00000001-0000-0000-0000-000000000005', 'Mbeya',         'region', NULL),
    ('00000001-0000-0000-0000-000000000006', 'Morogoro',      'region', NULL),
    ('00000001-0000-0000-0000-000000000007', 'Tanga',         'region', NULL),
    ('00000001-0000-0000-0000-000000000008', 'Zanzibar',      'region', NULL),
    ('00000001-0000-0000-0000-000000000009', 'Kilimanjaro',   'region', NULL),
    ('00000001-0000-0000-0000-000000000010', 'Pwani',         'region', NULL),
    ('00000001-0000-0000-0000-000000000011', 'Lindi',         'region', NULL),
    ('00000001-0000-0000-0000-000000000012', 'Mtwara',        'region', NULL),
    ('00000001-0000-0000-0000-000000000013', 'Ruvuma',        'region', NULL),
    ('00000001-0000-0000-0000-000000000014', 'Iringa',        'region', NULL),
    ('00000001-0000-0000-0000-000000000015', 'Mara',          'region', NULL),
    ('00000001-0000-0000-0000-000000000016', 'Shinyanga',     'region', NULL),
    ('00000001-0000-0000-0000-000000000017', 'Kagera',        'region', NULL),
    ('00000001-0000-0000-0000-000000000018', 'Kigoma',        'region', NULL),
    ('00000001-0000-0000-0000-000000000019', 'Tabora',        'region', NULL),
    ('00000001-0000-0000-0000-000000000020', 'Singida',       'region', NULL),
    ('00000001-0000-0000-0000-000000000021', 'Rukwa',         'region', NULL),
    ('00000001-0000-0000-0000-000000000022', 'Katavi',        'region', NULL),
    ('00000001-0000-0000-0000-000000000023', 'Geita',         'region', NULL),
    ('00000001-0000-0000-0000-000000000024', 'Njombe',        'region', NULL),
    ('00000001-0000-0000-0000-000000000025', 'Simiyu',        'region', NULL),
    ('00000001-0000-0000-0000-000000000026', 'Songwe',        'region', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Dar es Salaam Districts
-- ============================================================

INSERT INTO public.locations (id, name, level, parent_id) VALUES
    ('00000002-0000-0000-0000-000000000001', 'Ilala',        'district', '00000001-0000-0000-0000-000000000001'),
    ('00000002-0000-0000-0000-000000000002', 'Kinondoni',    'district', '00000001-0000-0000-0000-000000000001'),
    ('00000002-0000-0000-0000-000000000003', 'Temeke',       'district', '00000001-0000-0000-0000-000000000001'),
    ('00000002-0000-0000-0000-000000000004', 'Ubungo',       'district', '00000001-0000-0000-0000-000000000001'),
    ('00000002-0000-0000-0000-000000000005', 'Kigamboni',    'district', '00000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SERVICES
-- ============================================================

INSERT INTO public.services (id, name, name_en, description, description_en, fee, active, form_schema, document_template) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Cheti cha Mkazi',
    'Residence Certificate',
    'Cheti rasmi kinachohakikisha ukazi wa mwananchi katika mtaa au kijiji',
    'Official certificate confirming a citizen''s residence in a ward or village',
    5000.00,
    true,
    '[]'::jsonb,
    '{}'::jsonb
),
(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Kibali cha Mazisho',
    'Burial Permit',
    'Kibali rasmi kinachohitajika kwa ajili ya mazishi ya kisheria',
    'Official permit required for lawful burial proceedings',
    2000.00,
    true,
    '[]'::jsonb,
    '{}'::jsonb
),
(
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Kibali cha Sherehe',
    'Event Permit',
    'Kibali kinachohitajika kwa ajili ya kufanya sherehe au tukio la umma',
    'Permit required to organize a public event or celebration',
    10000.00,
    true,
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO USERS
-- Cannot be seeded via SQL — public.users has a foreign key to
-- auth.users which is managed by Supabase Auth internally.
--
-- To create demo users:
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Click "Invite user" or "Add user" for each:
--        citizen@e-mtaa.go.tz  — password: Demo1234!
--        staff@e-mtaa.go.tz    — password: Demo1234!
--        admin@e-mtaa.go.tz    — password: Demo1234!
--        mbazzacodes@gmail.com — password: set separately
--   3. The app's handleLogin will auto-create the public.users
--      profile row on first login.
-- ============================================================
