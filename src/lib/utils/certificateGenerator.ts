import jsPDF from 'jspdf';

interface CertificateData {
  studentName: string;
  projectTitle: string;
  score: number;
  totalScore: number;
  date: string;
  language: 'tr' | 'en';
  roomCode?: string;
  studentId?: string;
}

// ─── Font cache (avoid re-fetching on each certificate) ──────────────────────
const _fontCache: { regular?: string; bold?: string } = {};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return arrayBufferToBase64(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadFonts(): Promise<{ regular: string | null; bold: string | null }> {
  if (_fontCache.regular && _fontCache.bold) {
    return { regular: _fontCache.regular, bold: _fontCache.bold };
  }
  const [regular, bold] = await Promise.all([
    fetchFontBase64('/fonts/Roboto-Regular.ttf'),
    fetchFontBase64('/fonts/Roboto-Bold.ttf'),
  ]);
  if (regular) _fontCache.regular = regular;
  if (bold) _fontCache.bold = bold;
  return { regular, bold };
}

// ─── QR Code generator ───────────────────────────────────────────────────────
async function fetchQRDataUrl(text: string): Promise<string | null> {
  try {
    const size = 120;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&ecc=M`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Logo loader ─────────────────────────────────────────────────────────────
async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/app.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Fallback sanitizer (used only when Roboto fails to load) ─────────────────
const sanitize = (s: string) =>
  s
    ? s
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    : '';

// ─── Main generator ──────────────────────────────────────────────────────────
export const generateCertificate = async (data: CertificateData): Promise<void> => {
  const { score, totalScore, language } = data;
  const isTr = language === 'tr';

  // ─── Step 1: Register certificate on server and get verify code ───────────
  const PRODUCTION_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  let verifyCode = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    verifyCode = (array[0].toString(36) + array[1].toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
  } else {
    verifyCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  let verifyUrl = '';

  try {
    const roomCode = data.roomCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('room-joined-code') : undefined);
    const studentId = data.studentId || (typeof localStorage !== 'undefined' ? localStorage.getItem('room-student-id') : undefined);

    const res = await fetch('/api/certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: data.studentName,
        projectTitle: data.projectTitle,
        score,
        totalScore,
        date: data.date,
        language,
        roomCode,
        studentId
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.verifyCode) {
        verifyCode = json.data.verifyCode;
      }
    }
    verifyUrl = `${PRODUCTION_URL}/verify?code=${verifyCode}`;
  } catch {
    verifyUrl = `${PRODUCTION_URL}/verify?code=${verifyCode}`;
  }

  // ─── Step 2: Fetch all resources in parallel ──────────────────────────────
  const [qrDataUrl, logoDataUrl, fonts] = await Promise.all([
    fetchQRDataUrl(verifyUrl),
    fetchLogoDataUrl(),
    loadFonts(),
  ]);

  const hasTurkishFont = !!(fonts.regular && fonts.bold);

  // Raw strings — used with Roboto (full Unicode)
  const studentNameRaw = data.studentName.toUpperCase();
  const projectTitleRaw = data.projectTitle;
  const dateRaw = data.date;

  // Sanitized fallback — used with Helvetica
  const studentName = hasTurkishFont ? studentNameRaw : sanitize(data.studentName).toUpperCase();
  const projectTitle = hasTurkishFont ? projectTitleRaw : sanitize(data.projectTitle);
  const date = hasTurkishFont ? dateRaw : sanitize(data.date);

  // ─── Step 3: Build PDF ────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Register Roboto fonts for Turkish character support
  if (hasTurkishFont) {
    doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular ?? '');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold ?? '');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  }

  const fontName = hasTurkishFont ? 'Roboto' : 'helvetica';
  const setNormal = () => doc.setFont(fontName, 'normal');
  const setBold = () => doc.setFont(fontName, 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw border
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Background
  doc.setFillColor(245, 247, 250);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26, 'F');

  // ─── QR (top-left) ────────────────────────────────────────────────────────
  const qrSize = 28;
  const qrX = 15;
  const qrY = 15;

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  } else {
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.rect(qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
  }

  // Verification code below QR
  doc.setFontSize(8);
  setNormal();
  doc.text(`${isTr ? 'Kod' : 'Code'}: ${verifyCode}`, qrX, qrY + qrSize + 10);

  // ─── Logo (top-right) ─────────────────────────────────────────────────────
  const logoSize = 28;
  const logoX = pageWidth - logoSize - 15;
  const logoY = 15;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
  }

  // ─── Title ────────────────────────────────────────────────────────────────
  doc.setTextColor(44, 62, 80);
  setBold();
  doc.setFontSize(26);
  const titleText = isTr ? 'BAŞARI SERTİFİKASI' : 'CERTIFICATE OF ACHIEVEMENT';
  doc.text(titleText, pageWidth / 2, 58, { align: 'center' });

  // Subtitle
  doc.setFontSize(16);
  setNormal();
  const subtitleText = isTr
    ? 'Bu belge aşağıdaki kişinin başarıyla tamamladığını onaylar:'
    : 'This is to certify that';
  doc.text(subtitleText, pageWidth / 2, 72, { align: 'center' });

  // Student Name
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(30);
  setBold();
  doc.text(studentName, pageWidth / 2, 90, { align: 'center' });

  // Project Info
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(16);
  setNormal();
  doc.text(
    isTr ? 'Eğitim Modülü:' : 'Has successfully completed the lab:',
    pageWidth / 2, 108, { align: 'center' }
  );

  setBold();
  doc.setFontSize(14);
  doc.text(projectTitle, pageWidth / 2, 121, { align: 'center' });

  // Score
  setNormal();
  doc.setFontSize(14);
  doc.text(
    `${isTr ? 'Başarı Puanı' : 'Achievement Score'}: ${score} / ${totalScore}`,
    pageWidth / 2, 138, { align: 'center' }
  );

  // Date
  doc.setFontSize(13);
  doc.text(`${isTr ? 'Tarih' : 'Date'}: ${date}`, 40, 165);

  // Expiration Date (1 Year validity)
  const expireDateObj = new Date();
  expireDateObj.setFullYear(expireDateObj.getFullYear() + 1);
  const expireDateRaw = expireDateObj.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
  const expireDate = hasTurkishFont ? expireDateRaw : sanitize(expireDateRaw);

  doc.text(`${isTr ? 'Geçerlilik Tarihi' : 'Expiration Date'}: ${expireDate}`, 40, 172);

  // Signature lines
  doc.setDrawColor(189, 195, 199);
  doc.line(40, 182, 100, 182);
  doc.line(pageWidth - 100, 182, pageWidth - 40, 182);

  doc.setTextColor(44, 62, 80);
  doc.setFontSize(11);
  doc.text(isTr ? 'Eğitmen' : 'Instructor', 70, 189, { align: 'center' });
  doc.text(isTr ? 'Program Yöneticisi' : 'Program Director', pageWidth - 70, 189, { align: 'center' });

  // Footer
  setNormal();
  doc.setFontSize(9);
  doc.setTextColor(127, 140, 141);
  doc.text('Network Simulator', pageWidth / 2, pageHeight - 15, { align: 'center' });

  doc.save(`Sertifika-${data.studentName.replace(/\s+/g, '_')}.pdf`);
};
