import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Application } from '@/lib/supabase';

interface DeferredPDFPreviewProps {
  application: Application;
  service?: Application['services'];
  title: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
}

export function DeferredPDFPreview({
  application,
  service,
  title,
  subtitle,
  closeLabel,
  onClose,
}: DeferredPDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;

    Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/PDFFactory'),
    ])
      .then(async ([pdfRendererModule, factoryModule]) => {
        if (!isActive) return;

        const documentNode = React.createElement(factoryModule.PDFFactory, {
          application,
          lang: 'sw',
        });

        const blob = await pdfRendererModule.pdf(documentNode as React.ReactElement).toBlob();
        objectUrl = URL.createObjectURL(blob);

        if (!isActive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setPdfUrl(objectUrl);
      })
      .catch(() => {
        if (!isActive) return;
        setLoadError(true);
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [application, service]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-stone-50">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            {subtitle ? <p className="text-sm text-stone-500">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} title={closeLabel} aria-label={closeLabel} className="text-stone-400 hover:text-stone-600">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 bg-stone-900">
          {loadError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-white/80">
              Failed to load the PDF preview.
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={title}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-3 text-white">
              <Loader2 className="animate-spin" size={22} />
              <span>Loading preview...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}