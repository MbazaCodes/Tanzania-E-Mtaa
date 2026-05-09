/**
 * Shared Types and Styles for Document PDFs
 */
import { StyleSheet } from '@react-pdf/renderer';
import { Application } from '@/lib/supabase';

export interface DocumentPDFProps {
  application: Application;
  lang: 'sw' | 'en';
}

// Common styles for all PDF documents
export const commonStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1c1917',
  },
  photoSection: {
    position: 'absolute',
    top: 28,
    left: 28,
    width: 68,
    alignItems: 'center',
  },
  photoBox: {
    width: 58,
    height: 72,
    borderWidth: 1,
    borderColor: '#78716c',
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  photo: {
    width: 56,
    height: 70,
    objectFit: 'cover',
  },
  photoPlaceholder: {
    fontSize: 7,
    color: '#a8a29e',
    textAlign: 'center',
  },
  nidaLabel: {
    fontSize: 5.5,
    color: '#78716c',
    marginBottom: 1,
  },
  nidaNumber: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  header: {
    marginBottom: 10,
    textAlign: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    marginBottom: 5,
  },
  country: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  office: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#44403c',
  },
  divider: {
    width: 50,
    height: 1.5,
    backgroundColor: '#1c1917',
    marginTop: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subject: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  body: {
    lineHeight: 1.6,
    textAlign: 'justify',
    marginBottom: 40,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#a8a29e',
    marginBottom: 6,
  },
  signatureName: {
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  signatureTitle: {
    fontSize: 8,
    color: '#78716c',
  },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    paddingTop: 6,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#a8a29e',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  metadata: {
    fontSize: 5.5,
    color: '#d6d3d1',
    fontFamily: 'Courier',
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 80,
    color: '#f5f5f4',
    opacity: 0.1,
    transform: 'rotate(-45deg)',
    zIndex: -1,
  },
  qrSection: {
    position: 'absolute',
    bottom: 62,
    right: 28,
    alignItems: 'center',
  },
  qrCode: {
    width: 55,
    height: 55,
    marginBottom: 3,
  },
  qrLabel: {
    fontSize: 5.5,
    color: '#78716c',
    textAlign: 'center',
  },
  // Additional styles for specific sections
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  infoLabel: {
    width: '38%',
    fontWeight: 'bold',
    fontSize: 8.5,
    color: '#57534e',
  },
  infoValue: {
    width: '62%',
    fontSize: 8.5,
    color: '#1c1917',
  },
  sectionHeader: {
    backgroundColor: '#f5f5f4',
    padding: 5,
    marginBottom: 8,
    marginTop: 10,
    borderLeftWidth: 2.5,
    borderLeftColor: '#059669',
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#065f46',
    textTransform: 'uppercase',
  },
});

// Helper function to generate QR code URL
export const generateQRCodeUrl = (application: Application, serviceName: string): string => {
  const verificationData = JSON.stringify({
    id: application.id,
    app_no: application.application_number,
    service: serviceName,
    issued: new Date().toISOString().split('T')[0]
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData)}`;
};

// Helper function to format user full name
export const formatFullName = (user: any): string => {
  return `${user?.first_name || ''} ${user?.middle_name || ''} ${user?.last_name || ''}`.replace(/\s+/g, ' ').trim();
};

// Helper function to format date
export const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('sw-TZ');
  return new Date(dateString).toLocaleDateString('sw-TZ');
};

// Helper function to format currency
export const formatCurrency = (amount?: number): string => {
  if (!amount) return 'N/A';
  return `TZS ${amount.toLocaleString()}`;
};
