-- ============================================================
-- E-SERIKALI MTAA — FILE 1: SCHEMA
-- Tables, Enums, Sequences, Functions, Triggers, Indexes
-- Consolidated from all migrations (2024-03-02 → 2026-04-11)
-- Run this first, then 02_rls.sql, then 03_seed.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE business_type AS ENUM ('seller', 'landlord', 'broker');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE business_registration_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE client_relationship_type AS ENUM ('tenant', 'buyer', 'renter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE client_relationship_status AS ENUM ('active', 'inactive', 'pending', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS citizen_id_seq START WITH 1;

-- ============================================================
-- TABLE: locations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.locations (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    level       TEXT CHECK (level IN ('region', 'district', 'ward', 'street')) NOT NULL,
    parent_id   UUID REFERENCES public.locations(id),
    code        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_level  ON public.locations(level);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON public.locations(parent_id);

-- ============================================================
-- TABLE: offices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.offices (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    region      TEXT,
    district    TEXT,
    ward        TEXT,
    street      TEXT,
    phone       TEXT,
    email       TEXT,
    address     TEXT,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: users (extends Supabase Auth)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    -- Identity
    id                          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name                  TEXT,
    middle_name                 TEXT,
    last_name                   TEXT,
    gender                      TEXT,
    sex                         TEXT,
    date_of_birth               DATE,
    place_of_birth              TEXT,
    marital_status              TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    occupation                  TEXT,
    education_level             TEXT CHECK (education_level IN ('none', 'primary', 'secondary', 'diploma', 'degree', 'masters', 'phd')),
    nationality                 TEXT DEFAULT 'Tanzanian',
    country_of_citizenship      TEXT DEFAULT 'Tanzania',
    tribe                       TEXT,
    religious_affiliation       TEXT,
    blood_group                 TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    disability_status           TEXT CHECK (disability_status IN ('none', 'physical', 'visual', 'hearing', 'speech', 'multiple')),

    -- ID Documents
    nida_number                 TEXT UNIQUE,
    id_type                     TEXT,
    id_number                   TEXT,
    passport_number             TEXT,
    voter_id_number             TEXT,
    driving_license_number      TEXT,
    citizen_id                  TEXT UNIQUE,

    -- Business IDs
    seller_id                   VARCHAR(20),
    landlord_id                 VARCHAR(20),
    broker_id                   VARCHAR(20),

    -- Contact
    phone                       TEXT,
    alternative_phone           TEXT,
    email                       TEXT,
    email_address               TEXT,
    alternative_email           TEXT,
    photo_url                   TEXT,

    -- Location (Residential)
    region                      TEXT,
    district                    TEXT,
    ward                        TEXT,
    street                      TEXT,
    house_number                TEXT,
    postal_code                 TEXT,
    landmark                    TEXT,

    -- Birth location
    birth_region                TEXT,
    birth_district              TEXT,

    -- Diaspora
    is_diaspora                 BOOLEAN DEFAULT false,
    country_of_residence        TEXT,
    city_of_residence           TEXT,
    diaspora_region             TEXT,
    diaspora_district           TEXT,
    diaspora_ward               TEXT,

    -- Emergency Contact
    emergency_contact_name      TEXT,
    emergency_contact_phone     TEXT,
    emergency_contact_relation  TEXT,

    -- Staff / Work Info
    office_id                   UUID,
    assigned_region             TEXT,
    assigned_district           TEXT,
    employee_id                 TEXT,
    department                  TEXT,
    position                    TEXT,
    employment_date             DATE,

    -- Local Government Officials
    mtaa_executive_officer      TEXT,
    ward_councillor             TEXT,
    ward_chairperson            TEXT,

    -- Access
    role                        TEXT CHECK (role IN ('citizen', 'staff', 'admin')) DEFAULT 'citizen',
    is_verified                 BOOLEAN DEFAULT FALSE,
    account_status              TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending')),
    email_verified              BOOLEAN DEFAULT false,
    phone_verified              BOOLEAN DEFAULT false,
    last_login                  TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_citizen_id     ON public.users(citizen_id);
CREATE INDEX IF NOT EXISTS idx_users_nida           ON public.users(nida_number)    WHERE nida_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone          ON public.users(phone)          WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email          ON public.users(email)          WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_region_district ON public.users(region, district) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_alternative_id ON public.users(id_type, id_number) WHERE id_type IS NOT NULL;

-- ============================================================
-- TABLE: service_categories
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_categories (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    name_sw     TEXT,
    description TEXT,
    icon        TEXT,
    "order"     INTEGER DEFAULT 0,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: services
-- ============================================================

CREATE TABLE IF NOT EXISTS public.services (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name                TEXT NOT NULL,
    name_en             TEXT,
    description         TEXT,
    description_en      TEXT,
    form_schema         JSONB NOT NULL DEFAULT '[]'::jsonb,
    diaspora_form_schema JSONB,
    document_template   JSONB NOT NULL DEFAULT '{}'::jsonb,
    fee                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    validity_months     INTEGER,
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: applications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.applications (
    id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                     UUID REFERENCES public.users(id) NOT NULL,
    service_id                  UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name                TEXT,
    form_data                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    status                      TEXT DEFAULT 'submitted',
    application_number          TEXT UNIQUE,

    -- Location
    region                      TEXT,
    district                    TEXT,
    ward                        TEXT,
    street                      TEXT,
    assigned_staff_id           UUID REFERENCES public.users(id),
    assigned_office_id          UUID,
    location_id                 UUID,

    -- Payment
    payment_data                JSONB,

    -- Staff audit trail
    approved_by                 UUID REFERENCES public.users(id),
    approved_at                 TIMESTAMPTZ,
    rejected_by                 UUID REFERENCES public.users(id),
    rejected_at                 TIMESTAMPTZ,
    returned_by                 UUID REFERENCES public.users(id),
    returned_at                 TIMESTAMPTZ,
    issued_by                   UUID REFERENCES public.users(id),
    issued_at                   TIMESTAMPTZ,
    verified_by                 UUID REFERENCES public.users(id),
    verified_at                 TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT applications_status_check CHECK (
        status IS NULL OR status IN (
            'submitted', 'paid', 'verified', 'approved', 'issued',
            'rejected', 'pending_review', 'returned', 'pending_payment'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id       ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_office        ON public.applications(assigned_office_id);
CREATE INDEX IF NOT EXISTS idx_applications_approved_by   ON public.applications(approved_by);
CREATE INDEX IF NOT EXISTS idx_applications_issued_by     ON public.applications(issued_by);

-- ============================================================
-- TABLE: payments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id  UUID REFERENCES public.applications(id) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT,
    transaction_id  TEXT UNIQUE,
    receipt_number  TEXT UNIQUE,
    status          TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    breakdown       JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: generated_documents
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generated_documents (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id  UUID REFERENCES public.applications(id) NOT NULL,
    document_url    TEXT NOT NULL,
    qr_code_url     TEXT,
    certificate_id  TEXT UNIQUE,
    issue_date      DATE DEFAULT CURRENT_DATE,
    expiry_date     DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    active          BOOLEAN DEFAULT TRUE,
    ip_address      TEXT,
    user_agent      TEXT,
    title           VARCHAR(255),
    description     TEXT,
    location_id     UUID REFERENCES public.locations(id),
    start_date      DATE,
    end_date        DATE,
    start_time      TIME,
    end_time        TIME,
    capacity        INTEGER,
    registered_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(active);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES public.users(id),
    action      TEXT NOT NULL,
    details     JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: profile_change_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    field_name          TEXT NOT NULL,
    old_value           TEXT,
    new_value           TEXT NOT NULL,
    status              TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by         UUID REFERENCES public.users(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_changes_user   ON public.profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON public.profile_change_requests(status);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT,
    type        TEXT DEFAULT 'info',
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: agreement_notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agreement_notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    sender_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_citizen_id TEXT,
    notification_type   TEXT DEFAULT 'agreement_approval',
    message             TEXT,
    is_read             BOOLEAN DEFAULT false,
    is_actioned         BOOLEAN DEFAULT false,
    action_taken        TEXT,
    action_reason       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    actioned_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agreement_notifications_recipient    ON public.agreement_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_agreement_notifications_application  ON public.agreement_notifications(application_id);

-- ============================================================
-- TABLE: business_registrations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_type       business_type NOT NULL,
    business_id         VARCHAR(20) UNIQUE,
    business_name       VARCHAR(255),
    description         TEXT,
    experience_years    INTEGER DEFAULT 0,
    specialization      VARCHAR(255),
    region              VARCHAR(100),
    district            VARCHAR(100),
    ward                VARCHAR(100),
    street              VARCHAR(255),
    phone               VARCHAR(20),
    alt_phone           VARCHAR(20),
    email               VARCHAR(255),
    id_document_url     TEXT,
    proof_document_url  TEXT,
    photo_url           TEXT,
    status              business_registration_status DEFAULT 'pending',
    rejection_reason    TEXT,
    reviewed_by         UUID REFERENCES auth.users(id),
    reviewed_at         TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_registrations_user_id       ON public.business_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_type ON public.business_registrations(business_type);
CREATE INDEX IF NOT EXISTS idx_business_registrations_status        ON public.business_registrations(status);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_id   ON public.business_registrations(business_id);

-- ============================================================
-- TABLE: client_relationships
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_relationships (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    owner_business_id       VARCHAR(20),
    owner_business_type     VARCHAR(20),
    client_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_citizen_id       VARCHAR(20),
    relationship_type       client_relationship_type NOT NULL,
    property_type           VARCHAR(100),
    property_description    TEXT,
    property_address        TEXT,
    property_region         VARCHAR(100),
    property_district       VARCHAR(100),
    property_ward           VARCHAR(100),
    agreement_id            UUID,
    agreement_number        VARCHAR(50),
    monthly_rent            DECIMAL(15,2),
    total_price             DECIMAL(15,2),
    deposit_amount          DECIMAL(15,2),
    currency                VARCHAR(10) DEFAULT 'TZS',
    start_date              DATE NOT NULL,
    end_date                DATE,
    last_payment_date       DATE,
    next_payment_due        DATE,
    status                  client_relationship_status DEFAULT 'active',
    status_reason           TEXT,
    client_name             VARCHAR(255),
    client_phone            VARCHAR(20),
    client_email            VARCHAR(255),
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_relationships_owner_id            ON public.client_relationships(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_client_id           ON public.client_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_status              ON public.client_relationships(status);
CREATE INDEX IF NOT EXISTS idx_client_relationships_owner_business_id   ON public.client_relationships(owner_business_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_relationship_type   ON public.client_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_client_relationships_start_date          ON public.client_relationships(start_date);
CREATE INDEX IF NOT EXISTS idx_client_relationships_end_date            ON public.client_relationships(end_date);

-- ============================================================
-- TABLE: user_documents
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    document_type       TEXT NOT NULL,
    document_category   TEXT NOT NULL DEFAULT 'support',
    document_name       TEXT NOT NULL,
    document_url        TEXT NOT NULL,
    file_type           TEXT,
    file_size           INTEGER,
    verified            BOOLEAN DEFAULT false,
    verified_by         UUID REFERENCES public.users(id),
    verified_at         TIMESTAMPTZ,
    notes               TEXT,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id   ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_category  ON public.user_documents(document_category);

-- ============================================================
-- FUNCTIONS: Role helpers (SECURITY DEFINER — bypass RLS)
-- ============================================================

-- Returns raw role for current user without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role::TEXT FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role::TEXT FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(public.get_user_role_safe() IN ('staff', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_safe()  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role()       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff()   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin()            TO authenticated, anon;

-- ============================================================
-- FUNCTION: get_user_profile (full profile — avoids RLS)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_profile(UUID);

CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID, first_name TEXT, middle_name TEXT, last_name TEXT,
    gender TEXT, sex TEXT, date_of_birth DATE, place_of_birth TEXT,
    marital_status TEXT, occupation TEXT, education_level TEXT,
    nationality TEXT, country_of_citizenship TEXT,
    nida_number TEXT, id_type TEXT, id_number TEXT,
    passport_number TEXT, voter_id_number TEXT, driving_license_number TEXT,
    phone TEXT, alternative_phone TEXT, email TEXT, email_address TEXT,
    alternative_email TEXT, photo_url TEXT, role TEXT,
    is_verified BOOLEAN, is_diaspora BOOLEAN,
    country_of_residence TEXT, city_of_residence TEXT,
    diaspora_region TEXT, diaspora_district TEXT, diaspora_ward TEXT,
    region TEXT, district TEXT, ward TEXT, street TEXT,
    house_number TEXT, postal_code TEXT, landmark TEXT,
    emergency_contact_name TEXT, emergency_contact_phone TEXT, emergency_contact_relation TEXT,
    office_id UUID, assigned_region TEXT, assigned_district TEXT,
    employee_id TEXT, department TEXT, "position" TEXT, employment_date DATE,
    blood_group TEXT, disability_status TEXT, religious_affiliation TEXT, tribe TEXT,
    citizen_id TEXT, seller_id TEXT, landlord_id TEXT, broker_id TEXT,
    last_login TIMESTAMPTZ, account_status TEXT,
    email_verified BOOLEAN, phone_verified BOOLEAN,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        u.id, u.first_name, u.middle_name, u.last_name,
        u.gender, u.sex, u.date_of_birth, u.place_of_birth,
        u.marital_status, u.occupation, u.education_level,
        u.nationality, u.country_of_citizenship,
        u.nida_number, u.id_type, u.id_number,
        u.passport_number, u.voter_id_number, u.driving_license_number,
        u.phone, u.alternative_phone, u.email, u.email_address,
        u.alternative_email, u.photo_url, u.role::TEXT,
        u.is_verified, u.is_diaspora,
        u.country_of_residence, u.city_of_residence,
        u.diaspora_region, u.diaspora_district, u.diaspora_ward,
        u.region, u.district, u.ward, u.street,
        u.house_number, u.postal_code, u.landmark,
        u.emergency_contact_name, u.emergency_contact_phone, u.emergency_contact_relation,
        u.office_id, u.assigned_region, u.assigned_district,
        u.employee_id, u.department, u."position", u.employment_date,
        u.blood_group, u.disability_status, u.religious_affiliation, u.tribe,
        u.citizen_id, u.seller_id::TEXT, u.landlord_id::TEXT, u.broker_id::TEXT,
        u.last_login, u.account_status,
        u.email_verified, u.phone_verified,
        u.created_at, u.updated_at
    FROM public.users u
    WHERE u.id = user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated, anon;

-- ============================================================
-- FUNCTION + TRIGGER: Auto-generate application_number
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_app_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.application_number := 'APP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_generate_app_number ON public.applications;
CREATE TRIGGER tr_generate_app_number
    BEFORE INSERT ON public.applications
    FOR EACH ROW WHEN (NEW.application_number IS NULL)
    EXECUTE FUNCTION public.generate_app_number();

-- ============================================================
-- FUNCTION + TRIGGER: Auto-generate citizen_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_citizen_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    year_part   TEXT;
    letter_part TEXT;
    number_part TEXT;
    counter     INT;
BEGIN
    year_part   := TO_CHAR(CURRENT_DATE, 'YYYY');
    counter     := NEXTVAL('citizen_id_seq');
    letter_part := CHR(65 + ((counter - 1) / 99999) % 26);
    number_part := LPAD(((counter - 1) % 99999 + 1)::TEXT, 5, '0');
    RETURN 'CT' || year_part || letter_part || number_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_citizen_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.citizen_id IS NULL THEN
        NEW.citizen_id := public.generate_citizen_id();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_citizen_id ON public.users;
CREATE TRIGGER trigger_set_citizen_id
    BEFORE INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_citizen_id();

-- ============================================================
-- FUNCTION: generate_business_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_business_id(b_type business_type)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
    prefix    VARCHAR(2);
    year_part VARCHAR(4);
    letter    CHAR(1);
    seq_num   INTEGER;
    new_id    VARCHAR(20);
BEGIN
    CASE b_type
        WHEN 'seller'   THEN prefix := 'SL';
        WHEN 'landlord' THEN prefix := 'LL';
        WHEN 'broker'   THEN prefix := 'BR';
    END CASE;
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    letter    := CHR(65 + FLOOR(RANDOM() * 26)::INTEGER);
    SELECT COALESCE(MAX(
        CASE WHEN business_id ~ ('^' || prefix || '[0-9]{4}[A-Z][0-9]{5}$')
             THEN SUBSTRING(business_id FROM 8 FOR 5)::INTEGER ELSE 0 END
    ), 0) + 1 INTO seq_num
    FROM public.business_registrations
    WHERE business_type = b_type AND business_id IS NOT NULL;
    new_id := prefix || year_part || letter || LPAD(seq_num::TEXT, 5, '0');
    RETURN new_id;
END;
$$;

-- ============================================================
-- FUNCTION: approve_business_registration
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_business_registration(
    registration_id UUID,
    approver_id     UUID
)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
    reg_record      RECORD;
    new_business_id VARCHAR(20);
BEGIN
    SELECT * INTO reg_record FROM public.business_registrations WHERE id = registration_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
    IF reg_record.status = 'approved' THEN RETURN reg_record.business_id; END IF;
    new_business_id := public.generate_business_id(reg_record.business_type);
    UPDATE public.business_registrations SET
        status = 'approved', business_id = new_business_id,
        reviewed_by = approver_id, reviewed_at = NOW(),
        approved_at = NOW(), updated_at = NOW()
    WHERE id = registration_id;
    CASE reg_record.business_type
        WHEN 'seller'   THEN UPDATE public.users SET seller_id   = new_business_id WHERE id = reg_record.user_id;
        WHEN 'landlord' THEN UPDATE public.users SET landlord_id = new_business_id WHERE id = reg_record.user_id;
        WHEN 'broker'   THEN UPDATE public.users SET broker_id   = new_business_id WHERE id = reg_record.user_id;
    END CASE;
    RETURN new_business_id;
END;
$$;

-- ============================================================
-- TRIGGER: updated_at for client_relationships
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_client_relationship_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trigger_client_relationships_updated_at ON public.client_relationships;
CREATE TRIGGER trigger_client_relationships_updated_at
    BEFORE UPDATE ON public.client_relationships
    FOR EACH ROW EXECUTE FUNCTION public.update_client_relationship_timestamp();

-- ============================================================
-- TRIGGER: updated_at for user_documents
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_user_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trigger_user_documents_updated_at ON public.user_documents;
CREATE TRIGGER trigger_user_documents_updated_at
    BEFORE UPDATE ON public.user_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_user_documents_updated_at();
