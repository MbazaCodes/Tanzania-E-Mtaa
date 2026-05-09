/**
 * PDFFactory
 * Routes to the correct service-specific PDF component based on service name.
 * Falls back to the generic DocumentRenderer when no specific PDF exists.
 */
import React from 'react';
import type { Application } from '@/lib/supabase';
import { getServiceDocument } from '@/components/documents';
import { DocumentRenderer } from '@/components/DocumentRenderer';

interface PDFFactoryProps {
  application: Application;
  lang?: 'sw' | 'en';
}

export const PDFFactory: React.FC<PDFFactoryProps> = ({ application, lang = 'sw' }) => {
  const serviceName =
    (application as any).services?.name ||
    (application as any).service_name ||
    '';

  const ServicePDF = getServiceDocument(serviceName);

  if (ServicePDF) {
    return <ServicePDF application={application} lang={lang} />;
  }

  // Fallback: generic document renderer
  return (
    <DocumentRenderer
      application={application}
      service={(application as any).services}
    />
  );
};
