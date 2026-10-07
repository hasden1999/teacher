export interface PdfExportOptions {
  fileName?: string;
  title?: string;
  twoColumnLayout?: boolean;
  watermarkText?: string;
  scale?: number;
}

export interface ImageExportOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
  fileName?: string;
}

export interface WhatsAppShareOptions {
  targetPhone?: string;
  messageCaption?: string;
  fileName?: string;
}
