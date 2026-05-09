import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Application } from '@/lib/supabase';
import { TANZANIA_LOGO_BASE64 } from '@/constants/logo';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1c1917' },
  header: { marginBottom: 20, textAlign: 'center', alignItems: 'center' },
  logo: { width: 50, height: 50, marginBottom: 8 },
  country: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  office: { fontSize: 10, color: '#44403c', marginBottom: 4 },
  receiptTitle: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 10, marginBottom: 5, color: '#059669' },
  thickDivider: { width: '100%', height: 2, backgroundColor: '#059669', marginVertical: 15 },
  divider: { width: '100%', height: 1, backgroundColor: '#e7e5e4', marginVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 4 },
  label: { fontSize: 10, color: '#78716c', width: '40%' },
  value: { fontSize: 11, fontWeight: 'bold', textAlign: 'right', width: '60%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#1c1917' },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#44403c', textTransform: 'uppercase' },
  successBadge: { backgroundColor: '#d1fae5', padding: 10, borderRadius: 8, textAlign: 'center', marginVertical: 15 },
  successText: { color: '#059669', fontWeight: 'bold', fontSize: 12 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center' },
  footerText: { fontSize: 8, color: '#a8a29e', marginBottom: 4 },
  watermark: { position: 'absolute', top: '40%', left: '15%', fontSize: 80, color: '#f5f5f4', opacity: 0.1, transform: 'rotate(-45deg)', zIndex: -1 },
});

interface ReceiptPDFProps {
  application: Application;
  paymentData: { transaction_id: string; amount: number; payment_method: string; paid_at: string };
  lang: 'sw' | 'en';
}

const getPaymentMethodName = (method: string, lang: 'sw' | 'en'): string => {
  const methods: Record<string, { sw: string; en: string }> = {
    mpesa: { sw: 'M-Pesa', en: 'M-Pesa' },
    tigopesa: { sw: 'Tigo Pesa', en: 'Tigo Pesa' },
    airtelmoney: { sw: 'Airtel Money', en: 'Airtel Money' },
    nmb: { sw: 'NMB Bank', en: 'NMB Bank' },
    crdb: { sw: 'CRDB Bank', en: 'CRDB Bank' },
    card: { sw: 'Kadi ya Benki', en: 'Bank Card' },
    Visa: { sw: 'Visa Card', en: 'Visa Card' },
    Mastercard: { sw: 'Mastercard', en: 'Mastercard' },
  };
  return methods[method]?.[lang] || method;
};

const formatCurrencyPDF = (amount: number): string => `TZS ${amount.toLocaleString()}`;

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ application, paymentData, lang }) => {
  const service = (application as any).services;
  const user = (application as any).users;
  const paidDate = new Date(paymentData.paid_at);
  const formData = application.form_data || {};
  const grandTotal = paymentData.amount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>PAID</Text>

        <View style={styles.header}>
          <Image src={TANZANIA_LOGO_BASE64} style={styles.logo} />
          <Text style={styles.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={styles.office}>E-MTAA PORTAL - MFUMO WA HUDUMA ZA SERIKALI</Text>
          <Text style={styles.receiptTitle}>
            {lang === 'sw' ? 'RISITI YA MALIPO' : 'PAYMENT RECEIPT'}
          </Text>
        </View>

        <View style={styles.thickDivider} />

        <View style={styles.successBadge}>
          <Text style={styles.successText}>✓ {lang === 'sw' ? 'MALIPO YAMEKAMILIKA' : 'PAYMENT COMPLETED'}</Text>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'sw' ? 'Taarifa za Malipo' : 'Payment Information'}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Namba ya Muamala' : 'Transaction ID'}</Text>
            <Text style={styles.value}>{paymentData.transaction_id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Tarehe na Saa' : 'Date & Time'}</Text>
            <Text style={styles.value}>
              {paidDate.toLocaleDateString('sw-TZ')} {paidDate.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Njia ya Malipo' : 'Payment Method'}</Text>
            <Text style={styles.value}>{getPaymentMethodName(paymentData.payment_method, lang)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'sw' ? 'Taarifa za Huduma' : 'Service Information'}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Huduma' : 'Service'}</Text>
            <Text style={styles.value}>{service?.name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Namba ya Maombi' : 'Application No.'}</Text>
            <Text style={styles.value}>{application.application_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Mwombaji' : 'Applicant'}</Text>
            <Text style={styles.value}>
              {user?.first_name || formData.first_name || ''} {user?.last_name || formData.last_name || ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Amount Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'sw' ? 'Mgawanyiko wa Malipo' : 'Payment Breakdown'}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{lang === 'sw' ? 'Ada ya Huduma' : 'Service Fee'}</Text>
            <Text style={styles.value}>{formatCurrencyPDF(paymentData.amount)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{lang === 'sw' ? 'JUMLA KUU' : 'GRAND TOTAL'}</Text>
            <Text style={styles.totalValue}>{formatCurrencyPDF(Number(grandTotal))}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {lang === 'sw' 
              ? 'Risiti hii ni uthibitisho rasmi wa malipo yaliyofanywa kupitia mfumo wa E-Mtaa.'
              : 'This receipt is official confirmation of payment made through the E-Mtaa system.'}
          </Text>
          <Text style={styles.footerText}>
            {lang === 'sw' 
              ? 'Kwa maswali, wasiliana na ofisi yako ya mtaa.'
              : 'For inquiries, contact your local ward office.'}
          </Text>
          <Text style={{ fontSize: 6, color: '#d6d3d1', fontFamily: 'Courier' }}>
            VERIFICATION: {paymentData.transaction_id} | APP: {application.id.toUpperCase().slice(0, 8)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};