// src/components/pdf/DocumentPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Application } from '@/lib/supabase';
import { TANZANIA_LOGO_BASE64 } from '@/constants/logo';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#1c1917', backgroundColor: '#FAF8F0' },
  photoSection: { position: 'absolute', top: 40, left: 40, width: 80, alignItems: 'center' },
  photoBox: { width: 70, height: 85, borderWidth: 1, borderColor: '#78716c', backgroundColor: '#f5f5f4', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  photo: { width: 68, height: 83, objectFit: 'cover' },
  photoPlaceholder: { fontSize: 8, color: '#a8a29e', textAlign: 'center' },
  nidaLabel: { fontSize: 6, color: '#78716c', marginBottom: 2 },
  nidaNumber: { fontSize: 7, fontWeight: 'bold', color: '#1c1917' },
  header: { marginBottom: 30, textAlign: 'center', alignItems: 'center' },
  logo: { width: 60, height: 60, marginBottom: 10 },
  country: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  office: { fontSize: 12, fontWeight: 'bold', color: '#44403c' },
  divider: { width: 60, height: 2, backgroundColor: '#1c1917', marginTop: 10, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: 30 },
  subject: { fontWeight: 'bold', marginBottom: 20 },
  body: { lineHeight: 1.6, textAlign: 'justify', marginBottom: 40 },
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  signatureBox: { width: '45%' },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#a8a29e', marginBottom: 10 },
  signatureName: { fontWeight: 'bold', textTransform: 'uppercase' },
  signatureTitle: { fontSize: 10, color: '#78716c' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e7e5e4', paddingTop: 10, textAlign: 'center' },
  footerText: { fontSize: 8, color: '#a8a29e', fontStyle: 'italic', marginBottom: 4 },
  metadata: { fontSize: 6, color: '#d6d3d1', fontFamily: 'Courier' },
  watermark: { position: 'absolute', top: '40%', left: '20%', fontSize: 100, color: '#f5f5f4', opacity: 0.1, transform: 'rotate(-45deg)', zIndex: -1 },
  qrSection: { position: 'absolute', bottom: 80, right: 40, alignItems: 'center' },
  qrCode: { width: 70, height: 70, marginBottom: 4 },
  qrLabel: { fontSize: 6, color: '#78716c', textAlign: 'center' },
});

interface DocumentPDFProps {
  application: Application;
  lang: 'sw' | 'en';
}

export const DocumentPDF: React.FC<DocumentPDFProps> = ({ application, lang }) => {
  const service = (application as any).services;
  const user = (application as any).users || {};
  const template = service?.document_template || {};

  const verificationData = JSON.stringify({
    id: application.id,
    app_no: application.application_number,
    service: service?.name || 'N/A',
    issued: new Date().toISOString().split('T')[0],
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData)}`;

  const fullName = `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim() || 'Mwananchi';

  const getBody = () => {
    let body = template.body_template || (lang === 'sw' ? 'Hati hii inathibitisha kuwa maombi yameidhinishwa.' : 'This document confirms that the application has been approved.');
    const data = {
      ...application.form_data,
      FULL_NAME: fullName,
      NIDA_NUMBER: user.nida_number || 'N/A',
      DATE: new Date().toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-US'),
      APP_NUMBER: application.application_number,
      REGION: user.region || application.form_data?.region || '',
      DISTRICT: user.district || application.form_data?.district || '',
      WARD: user.ward || application.form_data?.ward || '',
      STREET: user.street || application.form_data?.street || '',
    };

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `[${key.toUpperCase()}]`;
      body = body.replace(new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'g'), String(value || ''));
    });
    return body;
  };

  const getSubject = () => {
    if (!template.subject) return '';
    return template.subject
      .replace('[FULL_NAME]', fullName)
      .replace('[HOUSE_NUMBER]', application.form_data?.house_number || '');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>E-MTAA</Text>

        {/* Official Photo & NIDA Box */}
        <View style={styles.photoSection}>
          <View style={styles.photoBox}>
            {user.photo_url ? (
              <Image src={user.photo_url} style={styles.photo} />
            ) : (
              <Text style={styles.photoPlaceholder}>PICHA{'\n'}PHOTO</Text>
            )}
          </View>
          <Text style={styles.nidaLabel}>{lang === 'sw' ? 'NIDA' : 'NIDA ID'}</Text>
          <Text style={styles.nidaNumber}>{user.nida_number || 'N/A'}</Text>
        </View>

        {/* Government Header */}
        <View style={styles.header}>
          <Image src={TANZANIA_LOGO_BASE64} style={styles.logo} />
          <Text style={styles.country}>{template.header?.country || 'JAMHURI YA MUUNGANO WA TANZANIA'}</Text>
          <Text style={styles.office}>{template.header?.office || 'OFISI YA RAIS - TAMISEMI'}</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.title}>{template.document_type || 'HATI RASMI'}</Text>

        <View>
          {template.subject && <Text style={styles.subject}>{getSubject()}</Text>}
          <Text style={styles.body}>{getBody()}</Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{fullName}</Text>
            <Text style={styles.signatureTitle}>{lang === 'sw' ? 'Sahihi ya Mwombaji' : 'Applicant Signature'}</Text>
          </View>
          <View style={[styles.signatureBox, { textAlign: 'right', alignItems: 'flex-end' }]}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{lang === 'sw' ? 'AFISA MTENDAJI WA MTAA' : 'WARD EXECUTIVE OFFICER'}</Text>
            <Text style={styles.signatureTitle}>{lang === 'sw' ? 'Sahihi na Muhuri' : 'Signature & Stamp'}</Text>
          </View>
        </View>

        {/* QR Verification */}
        <View style={styles.qrSection}>
          <Image src={qrCodeUrl} style={styles.qrCode} />
          <Text style={styles.qrLabel}>{lang === 'sw' ? 'Scan kuthibitisha' : 'Scan to verify'}</Text>
          <Text style={styles.qrLabel}>{application.application_number}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {template.footer || 'Hati hii ni rasmi na imetolewa kielektroniki kupitia mfumo wa E-Mtaa.'}
          </Text>
          <Text style={styles.metadata}>
            VERIFICATION ID: {application.id.toUpperCase()} | GENERATED ON: {new Date().toISOString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};