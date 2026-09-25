import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { csrfHeaders } from '@/lib/security/csrf';
import { colors } from '@/lib/design-tokens/colors';

interface CertificateData {
  studentName: string;
  projectTitle: string;
  score: number;
  totalScore: number;
  date: string;
  language: 'tr' | 'en';
  roomCode?: string;
  studentId?: string;
  isSoloMode?: boolean;
}

// ─── QR Code generator ───────────────────────────────────────────────────────
async function fetchQRDataUrl(text: string): Promise<string | null> {
  try {
    const size = 180;
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

// ─── Canvas Renderer (Guarantees 100% Perfect Turkish Character Support) ─────
async function renderCertificateCanvas(
  data: CertificateData,
  verifyCode: string,
  qrDataUrl: string | null,
  logoDataUrl: string | null
): Promise<string> {
  const width = 2400;
  const height = 1700;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  const isTr = data.language === 'tr';
  const isSoloMode = data.isSoloMode;

  // 1. Background fill
  ctx.fillStyle = colors.neutral[50];
  ctx.fillRect(0, 0, width, height);

  // 2. Outer decorative double border
  ctx.strokeStyle = colors.blue[700];
  ctx.lineWidth = 16;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  ctx.strokeStyle = colors.amber[600];
  ctx.lineWidth = 4;
  ctx.strokeRect(76, 76, width - 152, height - 152);

  // Inner card container
  ctx.fillStyle = colors.common.white;
  ctx.fillRect(84, 84, width - 168, height - 168);

  // Accent header band
  ctx.fillStyle = colors.topology.bg;
  ctx.fillRect(84, 84, width - 168, 20);

  // 3. Draw QR Code (Top-Left)
  const qrX = 120;
  const qrY = 130;
  const qrSize = 180;

  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      ctx.strokeStyle = colors.blue[600];
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    }
  }

  // Verification Code below QR
  ctx.font = 'bold 22px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.theme.secondary;
  ctx.textAlign = 'left';
  ctx.fillText(`${isTr ? 'Doğrulama Kodu' : 'Verify Code'}: ${verifyCode}`, qrX, qrY + qrSize + 35);

  // 4. Draw Logo (Top-Right)
  const logoSize = 180;
  const logoX = width - 120 - logoSize;
  const logoY = 130;

  if (logoDataUrl) {
    try {
      const logoImg = await loadImage(logoDataUrl);
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    } catch { /* Ignore if logo fails. */ }
  }

  // 5. Certificate Header & Title
  const centerX = width / 2;

  ctx.textAlign = 'center';

  // Solo Mode Badge (if applicable)
  if (isSoloMode) {
    ctx.fillStyle = colors.amber[100];
    ctx.strokeStyle = colors.amber[600];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(centerX - 250, 190, 500, 40, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = colors.amber[700];
    const soloBadgeText = isTr ? 'SOLO MOD - DOĞRULANMAMIŞ / BEYANİ ÇALIŞMA' : 'SOLO MODE - UNVERIFIED / SELF-REPORTED';
    ctx.fillText(soloBadgeText, centerX, 217);
  }

  // Sub-header Badge
  ctx.font = 'bold 26px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.amber[600];
  ctx.fillText('NETWORK SIMULATOR ACADEMY', centerX, isSoloMode ? 280 : 240);

  // Main Title
  ctx.font = 'bold 64px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.topology.canvasBg;
  const titleText = isTr ? 'BAŞARI SERTİFİKASI' : 'CERTIFICATE OF ACHIEVEMENT';
  ctx.fillText(titleText, centerX, isSoloMode ? 370 : 330);

  // Decorative line under title
  ctx.strokeStyle = colors.blue[600];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX - 250, isSoloMode ? 400 : 360);
  ctx.lineTo(centerX + 250, isSoloMode ? 400 : 360);
  ctx.stroke();

  // Subtitle
  ctx.font = '28px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.cables.console;
  const subtitleText = isTr
    ? 'Bu belge aşağıdaki katılımcının modülü başarıyla tamamladığını onaylar:'
    : 'This is to certify that';
  ctx.fillText(subtitleText, centerX, isSoloMode ? 480 : 440);

  // Student Name (Full Turkish Character Support)
  ctx.font = 'bold 68px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.blue[700];
  ctx.fillText(data.studentName.toUpperCase(), centerX, isSoloMode ? 590 : 550);

  // Underline for Student Name
  ctx.strokeStyle = colors.sky[200];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 350, isSoloMode ? 620 : 580);
  ctx.lineTo(centerX + 350, isSoloMode ? 620 : 580);
  ctx.stroke();

  // Project Info
  ctx.font = '26px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.theme.secondary;
  ctx.fillText(
    isTr ? 'Tamamlanan Eğitim Modülü:' : 'Has successfully completed the lab module:',
    centerX, isSoloMode ? 700 : 660
  );

  ctx.font = 'bold 44px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.topology.bg;
  ctx.fillText(data.projectTitle, centerX, isSoloMode ? 770 : 730);

  // Score Badge
  const scoreBoxWidth = 500;
  const scoreBoxHeight = 80;
  const scoreBoxX = centerX - scoreBoxWidth / 2;
  const scoreBoxY = isSoloMode ? 830 : 790;

  ctx.fillStyle = colors.green[50];
  ctx.strokeStyle = colors.green[600];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 32px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.green[700];
  ctx.fillText(
    `${isTr ? 'Başarı Puanı' : 'Achievement Score'}: ${data.score} / ${data.totalScore}`,
    centerX, scoreBoxY + 52
  );

  // Date & Validity (Bottom Left)
  ctx.textAlign = 'left';
  ctx.font = '26px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.topology.gridLine;
  ctx.fillText(`${isTr ? 'Tarih' : 'Date'}: ${data.date}`, 160, isSoloMode ? 1090 : 1050);

  const expireDateObj = new Date();
  expireDateObj.setFullYear(expireDateObj.getFullYear() + 1);
  const expireDateStr = expireDateObj.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
  ctx.fillText(`${isTr ? 'Geçerlilik Tarihi' : 'Expiration Date'}: ${expireDateStr}`, 160, isSoloMode ? 1140 : 1100);

  // Signature Lines (Bottom)
  ctx.strokeStyle = colors.cables.default;
  ctx.lineWidth = 3;

  const signatureY = isSoloMode ? 1360 : 1320;

  // Instructor Signature
  ctx.beginPath();
  ctx.moveTo(160, signatureY);
  ctx.lineTo(550, signatureY);
  ctx.stroke();

  ctx.font = 'bold 24px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.topology.canvasBg;
  ctx.fillText(isTr ? 'Eğitmen' : 'Instructor', 160, signatureY + 40);
  ctx.font = '22px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.cables.console;
  ctx.fillText('Network Simulator', 160, signatureY + 75);

  // Director Signature
  ctx.beginPath();
  ctx.moveTo(width - 550, signatureY);
  ctx.lineTo(width - 160, signatureY);
  ctx.stroke();

  ctx.font = 'bold 24px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.topology.canvasBg;
  ctx.fillText(isTr ? 'Program Yöneticisi' : 'Program Director', width - 550, signatureY + 40);
  ctx.font = '22px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.cables.console;
  ctx.fillText('...................', width - 550, signatureY + 75);

  // Footer text
  ctx.textAlign = 'center';
  ctx.font = '20px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = colors.cables.default;
  ctx.fillText('Network Simulator Certification System • Official Digital Document', centerX, isSoloMode ? 1590 : 1550);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// ─── Main Generator ──────────────────────────────────────────────────────────
export const generateCertificate = async (data: CertificateData): Promise<boolean> => {
  const sanitizedStudentName = (data.studentName || 'Student').trim().slice(0, 50);
  data = { ...data, studentName: sanitizedStudentName };
  const { score, totalScore, language } = data;
  const isTr = language === 'tr';

  // Step 1: Register certificate on server and get verify code
  const windowOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const PRODUCTION_URL = (process.env.APP_URL || windowOrigin).replace(/\/$/, '');
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

    let scoreToken: string | undefined = undefined;
    if (!roomCode) {
      const signRes = await fetch('/api/certificate/sign-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          studentName: data.studentName,
          projectTitle: data.projectTitle,
          score,
          totalScore,
        }),
      });
      let signJson: { success?: boolean; data?: { scoreToken?: string }; error?: string } = {};
      try {
        signJson = await signRes.json();
      } catch {
      }
      if (!signRes.ok || !signJson.success || !signJson.data?.scoreToken) {
        throw new Error(signJson.error || `Score signing failed (${signRes.status})`);
      }
      scoreToken = signJson.data.scoreToken;
    }

    const res = await fetch('/api/certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify({
        studentName: data.studentName,
        projectTitle: data.projectTitle,
        score,
        totalScore,
        date: data.date,
        language,
        roomCode,
        studentId,
        scoreToken,
      }),
    });

    if (!res.ok) {
      let errMsg = 'Registration failed';
      try {
        const json = await res.json();
        errMsg = json.error || errMsg;
      } catch {
        errMsg = res.statusText || errMsg;
      }
      throw new Error(errMsg);
    }

    const json = await res.json();
    if (!json.success || !json.data?.verifyCode) {
      throw new Error(json.error || 'Failed to register certificate');
    }

    verifyCode = json.data.verifyCode;
    verifyUrl = `${PRODUCTION_URL}/verify?code=${verifyCode}`;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    toast({
      title: isTr ? 'Sertifika Hatası' : 'Certificate Error',
      description: isTr
        ? `Sertifika sunucuya kaydedilemedi: ${errMsg}`
        : `Failed to register certificate on server: ${errMsg}`,
      variant: 'destructive',
    });
    return false;
  }

  try {
    // Step 2: Fetch resources in parallel
    const [qrDataUrl, logoDataUrl] = await Promise.all([
      fetchQRDataUrl(verifyUrl),
      fetchLogoDataUrl(),
    ]);

    const isSoloMode = !data.roomCode;
    const fullData: CertificateData = {
      ...data,
      isSoloMode: isSoloMode || data.isSoloMode,
    };

    // Step 3: Render Certificate with 100% Turkish Character Support via High-DPI Canvas
    const certificateImgData = await renderCertificateCanvas(fullData, verifyCode, qrDataUrl, logoDataUrl);

    // Step 4: Embed High-DPI Canvas Image into jsPDF (A4 Landscape)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.addImage(certificateImgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    doc.save(`Sertifika-${data.studentName.replace(/\s+/g, '_')}.pdf`);

    toast({
      title: isTr ? 'Sertifika İndirildi' : 'Certificate Downloaded',
      description: isTr ? 'Sertifikanız PDF formatında Türkçe karakterlerle başarıyla kaydedildi.' : 'Your certificate has been successfully saved as PDF.',
    });
    return true;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    toast({
      title: isTr ? 'Sertifika İndirilemedi' : 'Certificate Download Failed',
      description: isTr ? `PDF oluşturulamadı: ${errMsg}` : `The PDF could not be created: ${errMsg}`,
      variant: 'destructive',
    });
    return false;
  }
};
