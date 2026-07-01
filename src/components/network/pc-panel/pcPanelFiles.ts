export function getPCConfigDefaults(id: string) {
  const num = id.split('-')[1] || '1';
  return {
    ip: `192.168.1.${10 + parseInt(num)}`,
    mac: `00-40-96-99-88-7${num}`,
  };
}

const USER_FILES_POOL = [
  'proje_raporu.docx', 'butce_2026.xlsx', 'sunum.pptx',
  'notlar.txt', 'yapilacaklar.txt', 'iletisim_rehberi.txt',
  'toplanti_notlari.docx', 'kira_kontrati.pdf', 'fatura_ocak.pdf',
  'musteri_listesi.xlsx', 'urun_katalogu.pdf', 'teknik_dokuman.pdf',
  'sifreler.txt', 'is_plani.docx', 'haftalik_rapor.xlsx',
];

export function getDefaultPcFiles(deviceId: string): Array<{ name: string; size: number; modifiedAt: string }> {
  const num = Math.abs(parseInt(deviceId.split('-')[1] || '1', 10)) || 1;
  const systemFiles = [
    { name: 'autoexec.bat', size: 128, modifiedAt: '2026-01-15T08:00:00Z' },
    { name: 'config.sys', size: 256, modifiedAt: '2026-01-15T08:00:00Z' },
    { name: 'boot.ini', size: 512, modifiedAt: '2026-03-10T09:00:00Z' },
    { name: 'msdos.sys', size: 1024, modifiedAt: '2026-03-10T09:00:00Z' },
    { name: 'command.com', size: 2048, modifiedAt: '2026-03-10T09:00:00Z' },
  ];
  const userFiles: Array<{ name: string; size: number; modifiedAt: string }> = [];
  const seed = num % USER_FILES_POOL.length;
  for (let i = 0; i < 4; i++) {
    const idx = (seed + i * 3) % USER_FILES_POOL.length;
    const size = 1024 + ((num * 137 + i * 251) % 65536);
    const d = new Date(2026, 2, 10 + i, 9 + (num % 8), (num * 7 + i * 13) % 60);
    userFiles.push({ name: USER_FILES_POOL[idx], size, modifiedAt: d.toISOString() });
  }
  return [...systemFiles, ...userFiles];
}
