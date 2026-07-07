import jsPDF from 'jspdf';

interface CertificateData {
  studentName: string;
  projectTitle: string;
  score: number;
  totalScore: number;
  date: string;
  language: 'tr' | 'en';
}

export const generateCertificate = (data: CertificateData) => {
  // Helper to sanitize Turkish characters for standard PDF fonts (helvetica)
  // as they don't support specialized Turkish glyphs without font embedding.
  const sanitize = (s: string) => s ? s.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C') : '';

  const studentName = sanitize(data.studentName).toUpperCase();
  const projectTitle = sanitize(data.projectTitle);
  const date = sanitize(data.date);
  const { score, totalScore, language } = data;
  const isTr = language === 'tr';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw border
  doc.setDrawColor(41, 128, 185); // Primary color
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Background decoration
  doc.setFillColor(245, 247, 250);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26, 'F');

  // Title
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  const titleText = isTr ? 'BASARI SERTIFIKASI' : 'CERTIFICATE OF ACHIEVEMENT';
  doc.text(titleText, pageWidth / 2, 50, { align: 'center' });

  // Subtitle
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  const subtitleText = isTr ? 'Bu belge asagidaki kisinin basariyla tamamladigini onaylar:' : 'This is to certify that';
  doc.text(subtitleText, pageWidth / 2, 70, { align: 'center' });

  // Student Name
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName, pageWidth / 2, 90, { align: 'center' });

  // Project Info
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(isTr ? 'Egitim Modulu:' : 'Has successfully completed the lab:', pageWidth / 2, 110, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(projectTitle, pageWidth / 2, 125, { align: 'center' });

  // Score
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(`${isTr ? 'Basari Puani' : 'Achievement Score'}: ${score} / ${totalScore}`, pageWidth / 2, 145, { align: 'center' });

  // Date
  doc.setFontSize(14);
  doc.text(`${isTr ? 'Tarih' : 'Date'}: ${date}`, 40, 170);

  // Verification Code (dummy)
  const verifyCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  doc.text(`${isTr ? 'Dogrulama Kodu' : 'Verification Code'}: ${verifyCode}`, pageWidth - 40, 170, { align: 'right' });

  // Signature lines
  doc.setDrawColor(189, 195, 199);
  doc.line(40, 185, 100, 185);
  doc.line(pageWidth - 100, 185, pageWidth - 40, 185);

  doc.setTextColor(44, 62, 80);
  doc.setFontSize(12);
  doc.text(isTr ? 'Egitmen' : 'Instructor', 70, 192, { align: 'center' });
  doc.text(isTr ? 'Program Direktoru' : 'Program Director', pageWidth - 70, 192, { align: 'center' });

  // Footer
  doc.setFontSize(10);
  doc.text('CCNA Network Simulator Pro', pageWidth / 2, pageHeight - 15, { align: 'center' });

  doc.save(`Sertifika-${studentName.replace(/\s+/g, '_')}.pdf`);
};
