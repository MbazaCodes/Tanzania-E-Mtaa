-- ============================================================
-- E-SERIKALI MTAA — FILE 2: ROW LEVEL SECURITY + GRANTS
-- RLS enable, final policies, table grants, storage buckets
-- Run AFTER 01_schema.sql
-- ============================================================

-- ============================================================
-- TABLE GRANTS (authenticated users)
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT          ON public.locations             TO anon, authenticated;
GRANT SELECT          ON public.offices               TO anon, authenticated;
GRANT SELECT          ON public.service_categories    TO anon, authenticated;
GRANT SELECT          ON public.services              TO anon, authenticated;
GRANT ALL             ON public.users                 TO authenticated;
GRANT ALL             ON public.applications          TO authenticated;
GRANT ALL             ON public.payments              TO authenticated;
GRANT ALL             ON public.generated_documents   TO authenticated;
GRANT ALL             ON public.sessions              TO authenticated;
GRANT ALL             ON public.activity_logs         TO authenticated;
GRANT ALL             ON public.profile_change_requests TO authenticated;
GRANT ALL             ON public.notifications         TO authenticated;
GRANT ALL             ON public.agreement_notifications TO authenticated;
GRANT ALL             ON public.business_registrations TO authenticated;
GRANT ALL             ON public.client_relationships  TO authenticated;
GRANT ALL             ON public.user_documents        TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE citizen_id_seq TO authenticated;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_change_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_relationships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: users
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile"              ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile"            ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"            ON public.users;
DROP POLICY IF EXISTS "Staff can view all users"                ON public.users;
DROP POLICY IF EXISTS "Staff can update users"                  ON public.users;
DROP POLICY IF EXISTS "Admin can delete users"                  ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff can view all users" ON public.users
    FOR SELECT USING (public.get_user_role_safe() IN ('staff', 'admin'));

CREATE POLICY "Staff can update users" ON public.users
    FOR UPDATE USING (public.get_user_role_safe() IN ('staff', 'admin'));

CREATE POLICY "Admin can delete users" ON public.users
    FOR DELETE USING (public.get_user_role_safe() = 'admin');

CREATE POLICY "Authenticated users can view basic profiles" ON public.users
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS POLICIES: applications
-- ============================================================

DROP POLICY IF EXISTS "Citizens can view own applications"          ON public.applications;
DROP POLICY IF EXISTS "Citizens can insert own applications"        ON public.applications;
DROP POLICY IF EXISTS "Citizens can update their own applications"  ON public.applications;
DROP POLICY IF EXISTS "Staff can view all applications"             ON public.applications;
DROP POLICY IF EXISTS "Staff can update applications"               ON public.applications;
DROP POLICY IF EXISTS "Allow public verification by application_number" ON public.applications;

CREATE POLICY "Citizens can view own applications" ON public.applications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Citizens can insert own applications" ON public.applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Citizens can update their own applications" ON public.applications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Staff can view all applications" ON public.applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
    );

CREATE POLICY "Staff can update applications" ON public.applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
    );

CREATE POLICY "Allow public verification by application_number" ON public.applications
    FOR SELECT USING (true);

-- ============================================================
-- RLS POLICIES: payments
-- ============================================================

DROP POLICY IF EXISTS "Admin can view all payments"     ON public.payments;
DROP POLICY IF EXISTS "Staff can view all payments"     ON public.payments;
DROP POLICY IF EXISTS "Citizens can view own payments"  ON public.payments;
DROP POLICY IF EXISTS "Citizens can insert payments"    ON public.payments;

CREATE POLICY "Citizens can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
    );

CREATE POLICY "Staff can view all payments" ON public.payments
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Citizens can insert payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
    );

-- ============================================================
-- RLS POLICIES: generated_documents
-- ============================================================

DROP POLICY IF EXISTS "Admins full access to generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can view own documents"              ON public.generated_documents;
DROP POLICY IF EXISTS "Staff can view all generated_documents"    ON public.generated_documents;
DROP POLICY IF EXISTS "Staff can manage generated_documents"      ON public.generated_documents;

CREATE POLICY "Users can view own documents" ON public.generated_documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
    );

CREATE POLICY "Staff can view all generated_documents" ON public.generated_documents
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can manage generated_documents" ON public.generated_documents
    FOR ALL USING (public.is_admin_or_staff());

-- ============================================================
-- RLS POLICIES: service_categories
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view service categories"      ON public.service_categories;
DROP POLICY IF EXISTS "Admins can manage service categories"    ON public.service_categories;

CREATE POLICY "Anyone can view service categories" ON public.service_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage service categories" ON public.service_categories
    FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: services
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view services"    ON public.services;
DROP POLICY IF EXISTS "Admins can manage services"  ON public.services;

CREATE POLICY "Anyone can view services" ON public.services
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: offices
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view offices"    ON public.offices;
DROP POLICY IF EXISTS "Admins can manage offices"  ON public.offices;

CREATE POLICY "Anyone can view offices" ON public.offices
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage offices" ON public.offices
    FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: locations
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view locations"   ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

CREATE POLICY "Anyone can view locations" ON public.locations
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage locations" ON public.locations
    FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: activity_logs
-- ============================================================

DROP POLICY IF EXISTS "Users can view own activity"     ON public.activity_logs;
DROP POLICY IF EXISTS "Staff can view all activity"     ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert logs"          ON public.activity_logs;

CREATE POLICY "Users can view own activity" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all activity" ON public.activity_logs
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "System can insert logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS POLICIES: sessions
-- ============================================================

DROP POLICY IF EXISTS "Admin can view all sessions"     ON public.sessions;
DROP POLICY IF EXISTS "Users can manage own sessions"   ON public.sessions;

CREATE POLICY "Users can manage own sessions" ON public.sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all sessions" ON public.sessions
    FOR SELECT USING (public.is_admin_or_staff());

-- ============================================================
-- RLS POLICIES: profile_change_requests
-- ============================================================

DROP POLICY IF EXISTS "Users can view own change requests"      ON public.profile_change_requests;
DROP POLICY IF EXISTS "Users can insert change requests"        ON public.profile_change_requests;
DROP POLICY IF EXISTS "Staff can view profile_change_requests"  ON public.profile_change_requests;
DROP POLICY IF EXISTS "Staff can update profile_change_requests" ON public.profile_change_requests;

CREATE POLICY "Users can view own change requests" ON public.profile_change_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert change requests" ON public.profile_change_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view profile_change_requests" ON public.profile_change_requests
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can update profile_change_requests" ON public.profile_change_requests
    FOR UPDATE USING (public.is_admin_or_staff());

-- ============================================================
-- RLS POLICIES: notifications
-- ============================================================

DROP POLICY IF EXISTS "Users can view own notifications"    ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications"     ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Staff can view all notifications"    ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view all notifications" ON public.notifications
    FOR SELECT USING (public.is_admin_or_staff());

-- ============================================================
-- RLS POLICIES: agreement_notifications
-- ============================================================

DROP POLICY IF EXISTS "Users can view own agreement_notifications"    ON public.agreement_notifications;
DROP POLICY IF EXISTS "Recipients can update agreement_notifications" ON public.agreement_notifications;
DROP POLICY IF EXISTS "System can insert agreement_notifications"     ON public.agreement_notifications;

CREATE POLICY "Users can view own agreement_notifications" ON public.agreement_notifications
    FOR SELECT USING (recipient_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Recipients can update agreement_notifications" ON public.agreement_notifications
    FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "System can insert agreement_notifications" ON public.agreement_notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS POLICIES: business_registrations
-- ============================================================

DROP POLICY IF EXISTS "Users can view own registrations"            ON public.business_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations"          ON public.business_registrations;
DROP POLICY IF EXISTS "Users can update own pending registrations"  ON public.business_registrations;
DROP POLICY IF EXISTS "Staff can view all registrations"            ON public.business_registrations;
DROP POLICY IF EXISTS "Staff can update registrations"              ON public.business_registrations;
DROP POLICY IF EXISTS "Public can view approved registrations"      ON public.business_registrations;

CREATE POLICY "Users can view own registrations" ON public.business_registrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own registrations" ON public.business_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending registrations" ON public.business_registrations
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Staff can view all registrations" ON public.business_registrations
    FOR SELECT USING (public.get_user_role_safe() IN ('staff', 'admin'));

CREATE POLICY "Staff can update registrations" ON public.business_registrations
    FOR UPDATE USING (public.get_user_role_safe() IN ('staff', 'admin'));

CREATE POLICY "Public can view approved registrations" ON public.business_registrations
    FOR SELECT USING (status = 'approved');

-- ============================================================
-- RLS POLICIES: client_relationships
-- ============================================================

DROP POLICY IF EXISTS "Owners can view own relationships"    ON public.client_relationships;
DROP POLICY IF EXISTS "Clients can view own relationships"   ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can insert relationships"      ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can update own relationships"  ON public.client_relationships;
DROP POLICY IF EXISTS "Owners can delete own relationships"  ON public.client_relationships;
DROP POLICY IF EXISTS "Staff can view all relationships"     ON public.client_relationships;

CREATE POLICY "Owners can view own relationships" ON public.client_relationships
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Clients can view own relationships" ON public.client_relationships
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Owners can insert relationships" ON public.client_relationships
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own relationships" ON public.client_relationships
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own relationships" ON public.client_relationships
    FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Staff can view all relationships" ON public.client_relationships
    FOR SELECT USING (public.get_user_role_safe() IN ('staff', 'admin'));

-- ============================================================
-- RLS POLICIES: user_documents
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own documents"   ON public.user_documents;
DROP POLICY IF EXISTS "Users can upload their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Staff can view all documents"         ON public.user_documents;
DROP POLICY IF EXISTS "Staff can update documents"           ON public.user_documents;

CREATE POLICY "Users can view their own documents" ON public.user_documents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can upload their own documents" ON public.user_documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents" ON public.user_documents
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Staff can view all documents" ON public.user_documents
    FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_admin_or_staff());

CREATE POLICY "Staff can update documents" ON public.user_documents
    FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_admin_or_staff());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'documents',
            'documents',
            false,
            10485760,
            ARRAY['image/jpeg','image/png','image/webp','application/pdf']
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'business-documents',
            'business-documents',
            false,
            10485760,
            ARRAY['image/jpeg','image/png','image/webp','application/pdf']
        )
        ON CONFLICT (id) DO NOTHING;

        EXECUTE 'DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects';
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can view all documents" ON storage.objects';
        EXECUTE 'DROP POLICY IF EXISTS "Users can upload business documents" ON storage.objects';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view business documents" ON storage.objects';

        EXECUTE 'CREATE POLICY "Users can upload own documents" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = ''documents'' AND auth.uid()::TEXT = (storage.foldername(name))[1]
            )';

        EXECUTE 'CREATE POLICY "Users can view own documents" ON storage.objects
            FOR SELECT USING (
                bucket_id = ''documents'' AND auth.uid()::TEXT = (storage.foldername(name))[1]
            )';

        EXECUTE 'CREATE POLICY "Users can delete own documents" ON storage.objects
            FOR DELETE USING (
                bucket_id = ''documents'' AND auth.uid()::TEXT = (storage.foldername(name))[1]
            )';

        EXECUTE 'CREATE POLICY "Staff can view all documents" ON storage.objects
            FOR SELECT USING (
                bucket_id = ''documents'' AND public.is_admin_or_staff()
            )';

        EXECUTE 'CREATE POLICY "Users can upload business documents" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = ''business-documents'' AND auth.uid()::TEXT = (storage.foldername(name))[1]
            )';

        EXECUTE 'CREATE POLICY "Users can view business documents" ON storage.objects
            FOR SELECT USING (
                bucket_id = ''business-documents'' AND (
                    auth.uid()::TEXT = (storage.foldername(name))[1] OR
                    public.is_admin_or_staff()
                )
            )';
    ELSE
        RAISE NOTICE 'Skipping storage bucket setup because storage schema is unavailable.';
    END IF;
END $$;
