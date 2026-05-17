'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'tr' | 'en';

export interface Translations {
  about: string;
  aboutIntro: string;
  aboutTitle: string;
  accessDenied: string;
  accessibility: string;
  active: string;
  activePorts: string;
  activeSystem: string;
  add: string;
  addDevice: string;
  addDeviceOrCable: string;
  addDevicesFirst: string;
  addDnsRecord: string;
  addIoT: string;
  addFirewall: string;
  addIotDevice: string;
  addL2Switch: string;
  addL3Switch: string;
  addNote: string;
  addPC: string;
  addPc: string;
  addPcDevice: string;
  addPcShort: string;
  addPool: string;
  addRouter: string;
  addRouterShort: string;
  addSwitch: string;
  addSwitchShort: string;
  advancedHint: string;
  align: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignTop: string;
  alignMiddle: string;
  alignBottom: string;
  allCommands: string;
  allStepsCompleted: string;
  annotations: string;
  apActive: string;
  apNoClients: string;
  applicationError: string;
  ariaManagement: string;
  assetLoading: string;
  back: string;
  backgroundGreenhouse: string;
  backgroundHouse: string;
  backgroundNone: string;
  backgroundTwoStoryGarage: string;
  basicCommands: string;
  basicHint: string;
  bathroom: string;
  bedroom: string;
  beginner: string;
  blocked: string;
  bootInitializing: string;
  bootLoading: string;
  bootReady: string;
  bootingFlash: string;
  boxSelect: string;
  bugReport: string;
  cable: string;
  cableType: string;
  cableTypeSelector: string;
  cableTypes: string;
  cancel: string;
  celsius: string;
  channelLabel: string;
  channelShort: string;
  clear: string;
  clearSearch: string;
  clearTerminal: string;
  clearTerminalBtn: string;
  clearTerminalConfirm: string;
  cli: string;
  cliInterface: string;
  cliTerminal: string;
  clickIconsToRun: string;
  clientsLeased: string;
  close: string;
  closed: string;
  cmdSuggestions: string;
  colorLabel: string;
  commandHistory: string;
  commandModes: string;
  commandPromptTab: string;
  commandReference: string;
  commandsFound: string;
  completeWithTab: string;
  completedAt: string;
  configAndMonitor: string;
  configure: string;
  portStatus: string;
  vlanManagement: string;
  securityAndAcl: string;
  tasksAndScore: string;
  confirm: string;
  confirmReset: string;
  confirmResetDescription: string;
  confirmResetTitle: string;
  confirmationRequired: string;
  congrats: string;
  connect: string;
  connectDevices: string;
  connected: string;
  connectedLabel: string;
  connectedShort: string;
  connectedStatus: string;
  connectionError: string;
  console: string;
  consoleCable: string;
  consoleConfiguration: string;
  consolePasswordErrorDescription: string;
  consolePasswordErrorTitle: string;
  consolePingNotAllowed: string;
  consoleSecurity: string;
  consoleShort: string;
  consoleTab: string;
  consoleTerminal: string;
  contactEmail: string;
  contactErrorDesc: string;
  contactErrorTitle: string;
  contactMessage: string;
  contactName: string;
  contactPlaceholderEmail: string;
  contactPlaceholderMessage: string;
  contactPlaceholderName: string;
  contactSend: string;
  contactSuccessDesc: string;
  contactSuccessTitle: string;
  contactTitle: string;
  contactType: string;
  contactValidationEmail: string;
  contactValidationMessage: string;
  contactValidationName: string;
  continue: string;
  copy: string;
  copyAction: string;
  copyError: string;
  copySuccess: string;
  copyToastFailureDescription: string;
  copyToastFailureTitle: string;
  copyToastSuccessDescription: string;
  copyToastSuccessTitle: string;
  corruptedProject: string;
  create: string;
  criticalSecurity: string;
  crossover: string;
  crossoverCable: string;
  crossoverShort: string;
  currentStep: string;
  cut: string;
  dark: string;
  darkMode: string;
  definedUsers: string;
  delete: string;
  description: string;
  details: string;
  device: string;
  deviceInfo: string;
  deviceInfoShort: string;
  deviceInformation: string;
  deviceName: string;
  deviceNameLabel: string;
  deviceOff: string;
  deviceTasksAndConfig: string;
  devices: string;
  devicesCount: string;
  dhcpActiveServers: string;
  dhcpAssignments: string;
  dhcpCliConfig: string;
  dhcpEnabled: string;
  dhcpFailureDescription: string;
  dhcpFailureTitle: string;
  dhcpNoLease: string;
  dhcpNoPool: string;
  dhcpNotFound: string;
  dhcpPoolConfig: string;
  dhcpPoolDnsPlaceholder: string;
  dhcpPoolGatewayPlaceholder: string;
  dhcpPoolLabel: string;
  dhcpPoolMaxUsersPlaceholder: string;
  dhcpPoolNamePlaceholder: string;
  dhcpPoolStartIpPlaceholder: string;
  dhcpPoolSubnetPlaceholder: string;
  dhcpPoolsDescription: string;
  dhcpSuccessDescription: string;
  dhcpSuccessTitle: string;
  disabled: string;
  disconnect: string;
  disconnectAction: string;
  disconnectedStatus: string;
  dnsARecordLabel: string;
  dnsAddressPlaceholder: string;
  dnsAddressRequired: string;
  dnsCnameRecordLabel: string;
  dnsDomainPlaceholder: string;
  dnsGatewayRequired: string;
  dnsInvalidAddress: string;
  dnsNoRecords: string;
  dnsRecordManagerTip: string;
  dnsRecordsLabel: string;
  dnsServer: string;
  dontSave: string;
  dragToZoomOrScroll: string;
  distributeHorizontally: string;
  distributeVertically: string;
  duplex: string;
  duplicateLabel: string;
  dynamicRouting: string;
  edit: string;
  emptyProject: string;
  emptyProjectDesc: string;
  enableSecret: string;
  enabled: string;
  english: string;
  enterPassword: string;
  environmentBackground: string;
  environmentSettings: string;
  errorPrefix: string;
  ethernet: string;
  exam: string;
  exams: string;
  startExam: string;
  examMode: string;
  score: string;
  checklist: string;
  examDescription: string;
  finishExam: string;
  examResult: string;
  examTime: string;
  examCompleted: string;
  examTasks: string;
  examPoints: string;
  examStarted: string;
  examStatus: string;
  exit: string;
  exitPingMode: string;
  expand: string;
  exportLabel: string;
  extractingFiles: string;
  failedLoadProject: string;
  fastEthernetPorts: string;
  fileImportedSuccessfully: string;
  finish: string;
  fontLabel: string;
  fontSizeLabel: string;
  freePorts: string;
  fullScreen: string;
  gateway: string;
  gigabitPorts: string;
  gitAddressLabel: string;
  globalConfigLabel: string;
  goodSecurity: string;
  guidedMode: string;
  help: string;
  hideHint: string;
  highContrast: string;
  highRes: string;
  hostname: string;
  hostnameExample: string;
  httpServerLabel: string;
  httpServiceDescription: string;
  humidity: string;
  id: string;
  idle: string;
  importSuccess: string;
  initializingSystem: string;
  instructions: string;
  interfaceConfigLabel: string;
  intermediateHint: string;
  invalidDnsAddress: string;
  invalidGatewayAddress: string;
  invalidIpv4Address: string;
  invalidIpv6Address: string;
  invalidProject: string;
  invalidProjectFile: string;
  invalidSubnetMask: string;
  ipAddress: string;
  ipConfiguration: string;
  ipConfigurationLabel: string;
  ipInterfaces: string;
  ipMode: string;
  ipRenew: string;
  ipRouting: string;
  ipRoutingEngine: string;
  jsonDownloaded: string;
  keyboardNav: string;
  kitchen: string;
  labProgress: string;
  languageLabel: string;
  lastSavedAt: string;
  layer3Switching: string;
  levelAdvanced: string;
  levelBasic: string;
  levelIntermediate: string;
  licenseInfo: string;
  light: string;
  lightLevel: string;
  lightMode: string;
  lines: string;
  linkFrom: string;
  livingRoom: string;
  load: string;
  loadFailed: string;
  loadProject: string;
  lowRes: string;
  lowSecurity: string;
  macAddress: string;
  measurementLabel: string;
  mediumSecurity: string;
  menu: string;
  minimize: string;
  minutes: string;
  mode: string;
  modeConfig: string;
  modeInterface: string;
  modeLabel: string;
  modeLine: string;
  modePrivileged: string;
  modeUser: string;
  modeVlanLabel: string;
  model: string;
  motionYes: string;
  navigation: string;
  networkRefreshed: string;
  networkStatusUpdated: string;
  networkTopology: string;
  new: string;
  newBtn: string;
  newMessage: string;
  newNote: string;
  newProject: string;
  newProjectConfirm: string;
  newVlan: string;
  newVlanLabel: string;
  next: string;
  no: string;
  noCommandsAvailable: string;
  noConsoleCableDetected: string;
  noDevicesInTopology: string;
  noDevicesToList: string;
  noDhcpPools: string;
  noFreePorts: string;
  noFreePortsMessage: string;
  noIp: string;
  noIpInterfaces: string;
  noServices: string;
  noWifiConfig: string;
  noWifiDevices: string;
  nodePooling: string;
  none: string;
  nosVersion: string;
  notConnected: string;
  note: string;
  noteStyle: string;
  of: string;
  off: string;
  on: string;
  opacityLabel: string;
  open: string;
  openCLI: string;
  openCMD: string;
  openGuidedLesson: string;
  openNewProject: string;
  openNewProjectDesc: string;
  openServices: string;
  openSourceInfo: string;
  other: string;
  overview: string;
  pan: string;
  passive: string;
  passwordEncryption: string;
  paste: string;
  pcAccessDenied: string;
  pcCableError: string;
  pcConnected: string;
  pcConnectionClosed: string;
  pcConnectionError: string;
  pcConsoleHelp: string;
  pcConsoleTip: string;
  pcDisconnected: string;
  pcIncompatibleCable: string;
  pcIpconfigError: string;
  pcLoginSuccess: string;
  pcNoDeviceConnected: string;
  pcNotConnected: string;
  pcNslookupError: string;
  pcPingError: string;
  pcTelnetError: string;
  pcTerminal: string;
  pcTerminalClosing: string;
  pcTracertError: string;
  percent: string;
  fullscreen: string;
  gridSnapping: string;
  resetZoom: string;
  zoomIn: string;
  zoomOut: string;
  performanceOptimization: string;
  physicalConnectionDetected: string;
  ping: string;
  pingFailed: string;
  pingSuccess: string;
  pools: string;
  portClickTip: string;
  portInUse: string;
  portName: string;
  portSecurityBlocked: string;
  portSummary: string;
  ports: string;
  portsShort: string;
  power: string;
  powerOff: string;
  powerOn: string;
  pressEnterToConfirm: string;
  processing: string;
  progress: string;
  project: string;
  projectLoaded: string;
  projectSaved: string;
  pts: string;
  quickActions: string;
  quickCommands: string;
  quickSettings: string;
  quickSettingsAndTasks: string;
  realTimeUpdate: string;
  redo: string;
  refresh: string;
  refreshNetwork: string;
  refreshNetworkF5: string;
  reload: string;
  reloadPage: string;
  rename: string;
  reset: string;
  resetConfirm: string;
  resetToDefaults: string;
  resetView: string;
  resize: string;
  resizeAction: string;
  resizeLabel: string;
  room1: string;
  room2: string;
  routedPorts: string;
  routerInfoPanel: string;
  routing: string;
  routingTasks: string;
  runningConfig: string;
  save: string;
  saveError: string;
  saveLabel: string;
  saveProject: string;
  saveSuccess: string;
  saved: string;
  savedViaSheets: string;
  saving: string;
  screenReader: string;
  search: string;
  searchOutputDescription: string;
  searchOutputTitle: string;
  searchPlaceholder: string;
  searchProjects: string;
  searchShort: string;
  searchTerminal: string;
  secConsoleOff: string;
  secConsoleOn: string;
  secEnableSecretOff: string;
  secEnableSecretOn: string;
  secNoProtocol: string;
  secPassEncOff: string;
  secPassEncOn: string;
  secSshOnly: string;
  secTelnetWarn: string;
  secVtyOff: string;
  secVtyOn: string;
  securityControls: string;
  securityLabel: string;
  securityLevel: string;
  selectAll: string;
  selectCable: string;
  selectDevice: string;
  selectDeviceDropdown: string;
  selectSource: string;
  selectSourcePort: string;
  selectTarget: string;
  selectTargetPort: string;
  sending: string;
  services: string;
  servicesTab: string;
  settings: string;
  settingsTab: string;
  showHidePassword: string;
  showHint: string;
  holdToDrag: string;
  shutdownStatus: string;
  signal: string;
  simulatorCopyright: string;
  simulatorTitle: string;
  sizeLabel: string;
  skeletonScreens: string;
  skip: string;
  spatialPartitioning: string;
  speed: string;
  sshAccess: string;
  startTour: string;
  static: string;
  staticLabel: string;
  status: string;
  statusLabel: string;
  step1: string;
  step2: string;
  stpSwitchesUpdated: string;
  straight: string;
  straightCable: string;
  straightShort: string;
  subnetMask: string;
  subtitle: string;
  suggestion: string;
  suspended: string;
  switchMode: string;
  switchTasks: string;
  switchTerminal: string;
  switchTitle: string;
  syslogStarted: string;
  tabComplete: string;
  tabDescCmd: string;
  tabDescTasks: string;
  tabDescTerminal: string;
  tabDescTopology: string;
  tabToNext: string;
  tabsShort: string;
  targetGatewayRequired: string;
  taskCompleted: string;
  taskFailed: string;
  tasks: string;
  temperature: string;
  termsAndConditions: string;
  termsText: string;
  theme: string;
  themeLabel: string;
  tips: string;
  title: string;
  togglePower: string;
  topologyAriaLabel: string;
  topologyInvalidConnections: string;
  tour: string;
  turkish: string;
  tutorialCablesDesc: string;
  tutorialCablesTitle: string;
  tutorialDevicesDesc: string;
  tutorialDevicesTitle: string;
  tutorialPingDesc: string;
  tutorialPingTitle: string;
  tutorialProjectDesc: string;
  tutorialProjectTitle: string;
  tutorialReadyDesc: string;
  tutorialReadyTitle: string;
  tutorialThemeDesc: string;
  tutorialThemeTitle: string;
  tutorialTopologyDesc: string;
  tutorialTopologyTitle: string;
  tutorialWelcomeDesc: string;
  tutorialWelcomeTitle: string;
  tutorialWifiDesc: string;
  tutorialWifiTitle: string;
  typeCommand: string;
  typeCommandPlaceholder: string;
  unassigned: string;
  uncomplete: string;
  undo: string;
  unsaved: string;
  unsavedChangesConfirm: string;
  updatePool: string;
  uptime: string;
  vTaskAssignDesc: string;
  vTaskAssignName: string;
  vTaskCreateDesc: string;
  vTaskCreateName: string;
  vTaskFullNamingDesc: string;
  vTaskFullNamingHint: string;
  vTaskFullNamingName: string;
  vTaskMultipleDesc: string;
  vTaskMultipleName: string;
  vTaskNameDesc: string;
  vTaskNameName: string;
  vTaskTrunkDesc: string;
  vTaskTrunkName: string;
  viewportCulling: string;
  virtualScrolling: string;
  vlanExcellent: string;
  vlanGood: string;
  vlanId: string;
  vlanInProgress: string;
  vlanName: string;
  vlanNameExample: string;
  vlanNeeded: string;
  vlanNotApplicable: string;
  vlanOnlyOnNetworkDevices: string;
  vlanScore: string;
  vlanStatus: string;
  vlanTasks: string;
  vtySecurity: string;
  waitingForConnection: string;
  wifiAp: string;
  wifiChannel: string;
  wifiClient: string;
  wifiConfig: string;
  wifiConnected: string;
  wifiControlPanel: string;
  wifiDhcpStatusUpdated: string;
  wifiDisconnected: string;
  wifiMode: string;
  wifiOff: string;
  wifiOn: string;
  wifiPassword: string;
  wifiSecurity: string;
  wifiSignal: string;
  wifiSsid: string;
  wifiStatus: string;
  wirelessClientsConnected: string;
  wirelessClientsDisconnected: string;
  wireless: string;
  serial: string;
  wirelessStatus: string;
  yes: string;
  language: Language;
  intermediate: string;
  advanced: string;
}

const translations: Record<Language, Translations> = {
  tr: {
    about: 'Yardım',
    aboutIntro: 'Bu uygulama, ağ teknolojilerini ve terminal komutlarını öğrenmek isteyenler için tasarlanmış interaktif bir simülasyon aracıdır.',
    aboutTitle: 'Hakkında',
    accessDenied: '% Erişim reddedildi',
    accessibility: 'Erişilebilirlik',
    active: 'Aktif',
    activePorts: 'Aktif Portlar',
    activeSystem: 'Aktif Sistem',
    add: 'Ekle',
    addDevice: 'Cihaz Ekle',
    addDeviceOrCable: 'Cihaz veya Kablo Ekle',
    addDevicesFirst: 'Önce Cihaz Ekleyin',
    addDnsRecord: 'Kayıt Ekle',
    addIoT: 'IoT Ekle',
    addFirewall: 'Firewall Ekle',
    addIotDevice: 'IoT cihazı ekle',
    addL2Switch: 'L2 Switch ekle',
    addL3Switch: 'L3 Switch ekle',
    addNote: 'Not',
    addPC: 'PC Ekle',
    addPc: 'PC Ekle',
    addPcDevice: 'PC cihazı ekle',
    addPcShort: 'PC Ekle',
    addPool: 'Havuz Ekle',
    addRouter: 'Router ekle',
    addRouterShort: 'Router Ekle',
    addSwitch: 'Switch Ekle',
    addSwitchShort: 'Switch Ekle',
    advancedHint: 'Kapsamlı kurulum ve doğrulama laboratuvarları',
    align: 'Hizala',
    alignLeft: 'Sola Hizala',
    alignCenter: 'Ortala',
    alignRight: 'Sağa Hizala',
    alignTop: 'Üste Hizala',
    alignMiddle: 'Ortaya Hizala',
    alignBottom: 'Alta Hizala',
    allCommands: 'Tüm komutlar',
    allStepsCompleted: 'Tüm adımlar tamamlandı!',
    annotations: 'Notlar',
    apActive: 'X AP aktif',
    apNoClients: 'AP istemcisiz',
    applicationError: 'Uygulama hatası',
    ariaManagement: 'ARIA Yönetimi',
    assetLoading: 'Varlık Yükleme Stratejisi',
    back: 'Geri',
    backgroundGreenhouse: 'Sera Krokisi',
    backgroundHouse: 'Ev Krokisi',
    backgroundNone: 'Yok',
    backgroundTwoStoryGarage: '2 Katlı Bina',
    basicCommands: 'Temel komutlar',
    basicHint: 'Temel komutlar ve ilk topoloji adımları',
    bathroom: 'Banyo',
    bedroom: 'Yatak',
    beginner: 'Başlangıç',
    blocked: 'Engelli',
    bootInitializing: 'Donanım başlatılıyor...',
    bootLoading: 'Sistem yükleniyor...',
    bootReady: 'Hazır!',
    bootingFlash: 'Flash üzerinden önyükleme yapılıyor...',
    boxSelect: 'Kutu',
    bugReport: 'Hata Raporu',
    cable: 'Kablo',
    cableType: 'Kablo Tipi',
    cableTypeSelector: 'Kablo tipi seçici',
    cableTypes: 'Kablo Tipleri',
    cancel: 'İptal',
    celsius: '°C',
    channelLabel: 'Kanal:',
    channelShort: 'Kanal',
    clear: 'Temizle',
    clearSearch: 'Aramayı Temizle',
    clearTerminal: 'Terminali Temizle',
    clearTerminalBtn: 'Temizle',
    clearTerminalConfirm: 'Terminal çıktısı temizlenecek. Devam etmek istiyor musunuz?',
    cli: 'CLI',
    cliInterface: 'Command Line Interface',
    cliTerminal: 'CLI Terminal',
    clickIconsToRun: 'Program çalıştırmak için simgeleri tıklayınız',
    clientsLeased: 'X istemci kiraladı',
    close: 'Kapat',
    closed: 'Kapalı',
    cmdSuggestions: 'Komut önerileri',
    colorLabel: 'Renk',
    commandHistory: 'komut geçmişi',
    commandModes: 'Komut Modları:',
    commandPromptTab: 'Komut İstemi',
    commandReference: 'Yardım',
    commandsFound: 'komut bulundu',
    completeWithTab: 'ile tamamla',
    completedAt: 'Tamamlandı',
    configAndMonitor: 'yapılandırma ve izleme paneli',
    portStatus: 'Port Durumu',
    vlanManagement: 'VLAN Yönetimi',
    securityAndAcl: 'Güvenlik ve ACL',
    tasksAndScore: 'Görevler ve Puanlama',
    configure: 'Yapılandır',
    confirm: 'Onayla',
    confirmReset: 'Cihazı Sıfırla',
    confirmResetDescription: 'Tüm yapılandırma silinecek ve fabrika ayarları geri yüklenecek. Cihaz yeniden başlatılacak. Bu işlem geri alınamaz.',
    confirmResetTitle: 'Fabrika Ayarlarına Sıfırla?',
    confirmationRequired: 'Onay Gerekiyor',
    congrats: 'Tebrikler!',
    connect: 'Bağla',
    connectDevices: 'Bağla',
    connected: 'Bağlı',
    connectedLabel: 'Bağlı:',
    connectedShort: 'bağlı',
    connectedStatus: 'Bağlı',
    connectionError: 'Bağlantı hatası',
    console: 'Konsol',
    consoleCable: 'Konsol kablo',
    consoleConfiguration: 'Yapılandırma: 9600 bits/s, 8 data bits, no parity',
    consolePasswordErrorDescription: 'Lütfen doğru parolayı girin.',
    consolePasswordErrorTitle: 'Parola Hatalı',
    consolePingNotAllowed: 'Console bağlantısı üzerinden ping yapılamaz.',
    consoleSecurity: 'Console Güvenliği',
    consoleShort: 'Konsol',
    consoleTab: 'Konsol',
    consoleTerminal: 'Konsol Terminali',
    contactEmail: 'E-posta Adresiniz',
    contactErrorDesc: 'Bir ağ hatası oluştu. Lütfen sonra tekrar deneyin.',
    contactErrorTitle: 'Gönderilemedi',
    contactMessage: 'Mesajınız',
    contactName: 'Adınız',
    contactPlaceholderEmail: 'E-posta adresinizi girin',
    contactPlaceholderMessage: 'Mesajınızı yazın...',
    contactPlaceholderName: 'Adınızı girin',
    contactSend: 'Gönder',
    contactSuccessDesc: 'Mesajınız başarıyla gönderildi. Geri bildiriminiz için teşekkürler!',
    contactSuccessTitle: 'Mesaj Gönderildi',
    contactTitle: 'Mesaj',
    contactType: 'Konu',
    contactValidationEmail: 'Geçerli bir e-posta adresi girin',
    contactValidationMessage: 'Lütfen mesajınızı yazın',
    contactValidationName: 'Lütfen adınızı girin',
    continue: 'Devam Et',
    copy: 'Kopyala',
    copyAction: 'Kopyala',
    copyError: 'Kopyalama başarısız',
    copySuccess: 'Panoya kopyalandı',
    copyToastFailureDescription: 'Panoya erişilemedi.',
    copyToastFailureTitle: 'Kopyalama başarısız',
    copyToastSuccessDescription: 'Çıktı panoya kopyalandı.',
    copyToastSuccessTitle: 'Kopyalandı',
    corruptedProject: 'Proje dosyası bozuk veya uyumsuz!',
    create: 'Oluştur',
    criticalSecurity: 'Kritik güvenlik açıkları mevcut',
    crossover: 'Çapraz',
    crossoverCable: 'Çapraz kablo',
    crossoverShort: 'Çapraz',
    currentStep: 'Mevcut Adım',
    cut: 'Kes',
    dark: 'Koyu',
    darkMode: 'Koyu Tema',
    definedUsers: 'Tanımlı Kullanıcılar',
    delete: 'Sil',
    description: 'Açıklama',
    details: 'Detaylar',
    device: 'Cihaz',
    deviceInfo: 'CİHAZ BİLGİSİ',
    deviceInfoShort: 'Bilgi',
    deviceInformation: 'Cihaz Bilgileri',
    deviceName: 'Cihaz Adı',
    deviceNameLabel: 'Cihaz Adı',
    deviceOff: 'Cihaz Kapalı',
    deviceTasksAndConfig: 'Cihaz görevleri ve yapılandırma görevleri',
    devices: 'Cihazlar',
    devicesCount: 'cihaz',
    dhcpActiveServers: 'DHCP: X sunucu aktif',
    dhcpAssignments: 'DHCP Atamaları',
    dhcpCliConfig: 'DHCP havuzları CLI üzerinden yapılandırılabilir.',
    dhcpEnabled: 'DHCP Etkin',
    dhcpFailureDescription: 'DHCP sunucusu bulunamadı.',
    dhcpFailureTitle: 'DHCP ataması başarısız',
    dhcpNoLease: 'istemci kiralama alamadı',
    dhcpNoPool: 'sunucuda havuz yok',
    dhcpNotFound: 'DHCP bulunamadı',
    dhcpPoolConfig: 'DHCP havuzu yapılandırması bulunmuyor.',
    dhcpPoolDnsPlaceholder: 'DNS Sunucusu',
    dhcpPoolGatewayPlaceholder: 'Varsayılan Ağ Geçidi',
    dhcpPoolLabel: 'DHCP Havuzu',
    dhcpPoolMaxUsersPlaceholder: 'Maksimum Kullanıcı',
    dhcpPoolNamePlaceholder: 'Havuz Adı',
    dhcpPoolStartIpPlaceholder: 'Start IP',
    dhcpPoolSubnetPlaceholder: 'Alt Ağ Maskesi',
    dhcpPoolsDescription: 'DHCP havuzlarını ekle, düzenle ve sil.',
    dhcpSuccessDescription: 'DHCP ile {ip} atandı.',
    dhcpSuccessTitle: 'DHCP ataması başarılı',
    disabled: 'Pasif',
    disconnect: 'Bağlantıyı Kes',
    disconnectAction: 'Bağlantıyı Kes',
    disconnectedStatus: 'Bağlı Değil',
    dnsARecordLabel: 'A Kaydı (Address Record)',
    dnsAddressPlaceholder: 'Adres (192.168.1.10)',
    dnsAddressRequired: 'Alan adı çözümlemek için DNS adresi gerekli.',
    dnsCnameRecordLabel: 'CNAME Kaydı (Canonical Name Record)',
    dnsDomainPlaceholder: 'Alan adı (site.local)',
    dnsGatewayRequired: 'DNS sunucusuna erişim için gateway gerekli.',
    dnsInvalidAddress: 'DNS adresi geçersiz veya eksik.',
    dnsNoRecords: 'Henüz DNS kaydı yok.',
    dnsRecordManagerTip: 'Alan adı -> IP adresi kayıtlarını yönet.',
    dnsRecordsLabel: 'DNS (Domain Name System) Kayıtları',
    dnsServer: 'DNS Sunucusu',
    dontSave: 'Kaydetme',
    dragToZoomOrScroll: 'Sürükleyerek büyütün, Tek tıklanarak %100 değerine dönülür.',
    distributeHorizontally: 'Yatay Dağıt',
    distributeVertically: 'Dikey Dağıt',
    duplex: 'Çift Yönlü',
    duplicateLabel: 'Çoğalt',
    dynamicRouting: 'Dinamik Yönlendirme',
    edit: 'Düzenle',
    emptyProject: 'Boş Proje',
    emptyProjectDesc: 'Sıfırdan temiz bir topoloji ile başla',
    enableSecret: 'Enable Secret',
    enabled: 'Aktif',
    english: 'English',
    enterPassword: 'Parolayı girin...',
    environmentBackground: 'Arka Plan',
    environmentSettings: 'Ayarlar',
    errorPrefix: 'HATA',
    ethernet: 'Ethernet',
    exam: 'Sınav',
    exams: 'Sınavlar',
    startExam: 'Sınavı Başlat',
    examMode: 'Sınav Modu',
    score: 'Puan',
    checklist: 'Kontrol Listesi',
    examDescription: 'Sınav Açıklaması',
    finishExam: 'Sınavı Bitir',
    examResult: 'Sınav Sonucu',
    examTime: 'Sınav Süresi',
    examCompleted: 'Sınav Tamamlandı',
    examTasks: 'Sınav Görevleri',
    examPoints: 'Sınav Puanı',
    examStarted: 'Sınav Başladı',
    examStatus: 'Sınav Durumu',
    exit: 'Çık',
    exitPingMode: 'Ping modundan çık (ESC)',
    expand: 'Genişlet',
    exportLabel: 'Dışa Aktar',
    extractingFiles: 'Dosyalar flash üzerinden çıkarılıyor...',
    failedLoadProject: 'Proje dosyası yüklenemedi!',
    fastEthernetPorts: 'FastEthernet Portları (Fa0/1 - Fa0/24)',
    fileImportedSuccessfully: 'Dosya başarıyla içe aktarıldı.',
    finish: 'Bitir',
    fontLabel: 'Yazı Tipi',
    fontSizeLabel: 'Boyut',
    freePorts: 'boş port',
    fullScreen: 'Tam Ekran',
    gateway: 'Ağ Geçidi',
    gigabitPorts: 'GigabitEthernet Portları',
    gitAddressLabel: 'Kaynak Adresi',
    globalConfigLabel: 'Global yapılandırma',
    goodSecurity: 'İyi güvenlik seviyesi',
    guidedMode: 'Rehberli Ders',
    help: 'Yardım',
    hideHint: 'İpucu Gizle',
    highContrast: 'Yüksek Kontrast Desteği',
    highRes: 'Yüksek Çözünürlük',
    hostname: 'Ana Bilgisayar Adı',
    hostnameExample: 'Örn: Router-X',
    httpServerLabel: 'HTTP (Hypertext Transfer Protocol) Sunucu',
    httpServiceDescription: 'HTTP açıkken bu cihazın web içeriği yayınlanır.',
    humidity: 'Nem',
    id: 'ID',
    idle: 'Boşta',
    importSuccess: 'Dosya başarıyla içe aktarıldı.',
    initializingSystem: 'Sistem Başlatılıyor...',
    instructions: 'Talimatlar',
    interfaceConfigLabel: 'Arayüz yapılandırması',
    intermediateHint: 'Servisler, VLAN ve yönlendirme senaryoları',
    invalidDnsAddress: 'Geçerli bir DNS adresi girin.',
    invalidGatewayAddress: 'Geçerli bir gateway adresi girin.',
    invalidIpv4Address: 'Geçerli bir IPv4 adresi girin.',
    invalidIpv6Address: 'Geçerli bir IPv6 adresi girin.',
    invalidProject: 'Hata',
    invalidProjectFile: 'Geçersiz proje dosyası',
    invalidSubnetMask: 'Geçerli bir subnet mask girin.',
    ipAddress: 'IP Adresi',
    ipConfiguration: 'IP Yapılandırması',
    ipConfigurationLabel: 'IP Yapılandırma',
    ipInterfaces: 'IP Arayüzleri',
    ipMode: 'IP Modu',
    ipRenew: 'IP Yenile',
    ipRouting: 'IP Yönlendirme',
    ipRoutingEngine: 'IP Yönlendirme Motoru',
    jsonDownloaded: 'JSON dosyası indirildi.',
    keyboardNav: 'Klavye Navigasyonu',
    kitchen: 'Mutfak',
    labProgress: 'Lab İlerlemesi',
    languageLabel: 'Dil',
    lastSavedAt: 'Kayıt: ',
    layer3Switching: 'Katman 3 Anahtarlama',
    levelAdvanced: 'İleri Seviye',
    levelBasic: 'Basit Seviye',
    levelIntermediate: 'Orta Seviye',
    licenseInfo: 'Tuzla Mesleki ve Teknik Anadolu Lisesi',
    light: 'Açık',
    lightLevel: 'Işık',
    lightMode: 'Açık Tema',
    lines: 'satır',
    linkFrom: 'Bağlantı',
    livingRoom: 'Salon',
    load: 'Yükle',
    loadFailed: 'Yükleme başarısız',
    loadProject: 'Proje Yükle',
    lowRes: 'Düşük Çözünürlük',
    lowSecurity: 'Düşük güvenlik seviyesi',
    macAddress: 'MAC Adresi',
    measurementLabel: 'Ölçüm:',
    mediumSecurity: 'Orta güvenlik seviyesi',
    menu: 'Menü',
    minimize: 'Küçült',
    minutes: 'dakika',
    mode: 'Kip',
    modeConfig: 'Global Yapılandırma',
    modeInterface: 'Arayüz Yapılandırma',
    modeLabel: 'Mod:',
    modeLine: 'Hat Yapılandırma',
    modePrivileged: 'Ayrıcalıklı EXEC',
    modeUser: 'Kullanıcı EXEC',
    modeVlanLabel: 'VLAN Yapılandırma',
    model: 'Model',
    motionYes: 'Hareket Var',
    navigation: 'Navigasyon',
    networkRefreshed: 'Ağ Yenilendi',
    networkStatusUpdated: 'Ağ Durumu',
    networkTopology: 'Ağ Topolojisi',
    new: 'Yeni',
    newBtn: 'Yeni',
    newMessage: 'Yeni Mesaj',
    newNote: 'Yeni not...',
    newProject: 'Yeni Proje',
    newProjectConfirm: 'Tüm yapılandırma ve topoloji sıfırlanacak. Devam etmek istiyor musunuz?',
    newVlan: 'Yeni VLAN Oluştur',
    newVlanLabel: 'Yeni VLAN',
    next: 'İleri',
    no: 'Hayır',
    noCommandsAvailable: 'Bu modda hızlı komut yok',
    noConsoleCableDetected: 'Konsol kablosu algılanmadı. PC\'den bir ağ cihazına konsol kablosu bağlayın.',
    noDevicesInTopology: 'Topolojide henüz cihaz yok.',
    noDevicesToList: 'Listelenecek cihaz yok.',
    noDhcpPools: 'Henüz DHCP havuzu yok.',
    noFreePorts: 'Boş Port Yok',
    noFreePortsMessage: 'Lütfen, önce bazı kabloları çıkarın.',
    noIp: 'IP Yok',
    noIpInterfaces: 'IP adresi yapılandırılmış arayüz yok.',
    noServices: 'Servis yok',
    noWifiConfig: 'WiFi yapılandırması bulunmuyor.',
    noWifiDevices: 'WiFi cihazı bulunamadı',
    nodePooling: 'Düğüm Havuzlama',
    none: 'Yok',
    nosVersion: 'NOS Versiyon',
    notConnected: 'Bağlı Değil',
    note: 'Not',
    noteStyle: 'Not Biçimi',
    of: '/',
    off: 'Kapalı',
    on: 'Açık',
    opacityLabel: 'Saydamlık',
    open: 'Aç',
    openCLI: 'CLI Aç',
    openCMD: 'CMD Aç',
    openGuidedLesson: 'Rehberli Ders',
    openNewProject: 'Yeni Proje',
    openNewProjectDesc: 'Topolojinizi tasarlamaya başlamak için hazır bir senaryo seçin veya boş bir proje ile başlayın.',
    openServices: 'Açık Servisler',
    openSourceInfo: 'Bu proje açık kaynaklıdır',
    other: 'Diğer',
    overview: 'Genel Bakış',
    pan: 'Kaydır',
    passive: 'PASİF',
    passwordEncryption: 'Şifre Şifreleme',
    paste: 'Yapıştır',
    pcAccessDenied: 'Adrese doğrudan erişim yok.',
    pcCableError: 'Ağ kablosu bağlı değil.',
    pcConnected: 'PC bağlı',
    pcConnectionClosed: 'Bağlantı uzak bilgisayar tarafından kapatıldı.',
    pcConnectionError: 'Bağlantı hatası',
    pcConsoleHelp: 'Mevcut komutlar:\n  enable   - Privileged mode\n  exit     - Konsoldan çık\n  show     - Bilgi göster\n  ?        - Yardım\n',
    pcConsoleTip: 'Konsol kablosuyla bağlısınız. Lütfen, "terminal" komutunu kullanın.',
    pcDisconnected: 'PC bağlantısız',
    pcIncompatibleCable: 'Kablo tipi uyumsuz. PC-Switch için Düz Kablo gerekli.',
    pcIpconfigError: 'IP yapılandırması alınamadı.',
    pcLoginSuccess: 'Giriş başarılı',
    pcNoDeviceConnected: 'Bağlı bir cihaz yok',
    pcNotConnected: 'Herhangi bir switch veya router\'a bağlı değilsiniz.',
    pcNslookupError: 'NSLOOKUP: DNS sunucusuyla iletişim kurulamadı.',
    pcPingError: 'Ping isteği zaman aşımına uğradı.',
    pcTelnetError: 'TELNET: Bağlantı kurulamadı.',
    pcTerminal: 'PC Terminali',
    pcTerminalClosing: 'PC terminali kapatılıyor...',
    pcTracertError: 'TRACERT: Hedefe ulaşılamıyor.',
    percent: '%',
    fullscreen: 'Tam Ekran',
    gridSnapping: 'Izgara Yakalama',
    resetZoom: 'Yakınlaştırmayı Sıfırla',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    performanceOptimization: 'Performans Optimizasyonu',
    physicalConnectionDetected: 'Fiziksel bağlantı algılandı:',
    ping: 'Ping',
    pingFailed: 'Ping başarısız',
    pingSuccess: 'Ping başarılı',
    pools: 'Havuz',
    portClickTip: 'Port LED\'lerine tıklayarak hızlıca interface moduna geçebilirsiniz',
    portInUse: 'Bu port zaten kullanımda!',
    portName: 'Ad',
    portSecurityBlocked: 'Port Security: X bloklandı, Y açıldı',
    portSummary: 'Port Özeti',
    ports: 'Portlar',
    portsShort: 'Portlar',
    power: 'Güç',
    powerOff: 'Gücü Kapat',
    powerOn: 'Gücü Aç',
    pressEnterToConfirm: 'Devam etmek için Enter\'a basın',
    processing: 'İşleniyor...',
    progress: 'İlerleme',
    project: 'Proje',
    projectLoaded: 'Proje yüklendi',
    projectSaved: 'Proje kaydedildi',
    pts: 'puan',
    quickActions: 'Hızlı işlemler',
    quickCommands: 'Hızlı Komutlar',
    quickSettings: 'Hızlı Ayarlar',
    quickSettingsAndTasks: 'Görevler',
    realTimeUpdate: 'Gerçek zamanlı güncelleme aktif',
    redo: 'Yinele',
    refresh: 'Yenile',
    refreshNetwork: 'Ağı Yenile',
    refreshNetworkF5: 'Ağı Yenile',
    reload: 'Yeniden Yükle',
    reloadPage: 'Sayfayı Yenile',
    rename: 'Yeniden Adlandır',
    reset: 'Sıfırla',
    resetConfirm: 'Tüm yapılandırma sıfırlanacak. Devam etmek istiyor musunuz?',
    resetToDefaults: 'Varsayılana Sıfırla',
    resetView: 'Sıfırla',
    resize: 'Boyutlandır',
    resizeAction: 'Yeniden boyutlandır',
    resizeLabel: 'Yeniden Boyutlandır',
    room1: 'Oda 1',
    room2: 'Oda 2',
    routedPorts: 'Yönlendirilmiş Portlar',
    routerInfoPanel: 'Router Bilgi Paneli',
    routing: 'Yönlendirme',
    routingTasks: 'Yönlendirme Görevleri',
    runningConfig: 'Running-Config',
    save: 'Kaydet (wr)',
    saveError: 'Kaydetme sırasında bir hata oluştu',
    saveLabel: 'Kaydet',
    saveProject: 'Projeyi Kaydet',
    saveSuccess: 'Yapılandırma başarıyla kaydedildi',
    saved: 'Kaydedildi',
    savedViaSheets: 'Fikirlerinizi paylaşın',
    saving: 'Kaydediliyor...',
    screenReader: 'Ekran Okuyucu Duyuruları',
    search: 'Ara',
    searchOutputDescription: 'Eşleşmeler çıktı alanında vurgulanır.',
    searchOutputTitle: 'Çıktıda ara',
    searchPlaceholder: 'Arama...',
    searchProjects: 'Proje ara...',
    searchShort: 'Ara...',
    searchTerminal: 'Terminal çıktısında arama yapın',
    secConsoleOff: 'Console hattı için giriş yapılandırılmamış',
    secConsoleOn: 'Console hattı için giriş aktif',
    secEnableSecretOff: 'Enable şifresi yapılandırılmamış',
    secEnableSecretOn: 'Şifreli enable şifresi yapılandırılmış',
    secNoProtocol: 'Erişim protokolü yapılandırılmamış',
    secPassEncOff: 'Şifreler düz metin olarak saklanıyor',
    secPassEncOn: 'Şifreler şifrelenmiş durumda',
    secSshOnly: 'Sadece SSH erişimi aktif',
    secTelnetWarn: 'Telnet erişimi aktif (güvenli değil)',
    secVtyOff: 'VTY hatları için giriş yapılandırılmamış',
    secVtyOn: 'VTY hatları için giriş aktif',
    securityControls: 'Güvenlik Kontrolleri',
    securityLabel: 'Güvenlik:',
    securityLevel: 'Güvenlik Seviyesi',
    selectAll: 'Tümünü Seç',
    selectCable: 'Kablo Seç',
    selectDevice: 'Cihaz Seçimi',
    selectDeviceDropdown: 'Cihaz Seç',
    selectSource: 'Kaynak seç',
    selectSourcePort: 'Kaynak Portu Seç',
    selectTarget: 'Hedef seç',
    selectTargetPort: 'Hedef Portu Seç',
    sending: 'Gönderiliyor...',
    services: 'Servisler',
    servicesTab: 'Servisler',
    settings: 'Ayarlar',
    settingsTab: 'Ayarlar',
    showHidePassword: 'Parolayı Göster/Gizle',
    showHint: 'İpucu Göster',
    holdToDrag: 'Sürüklemek için tutun',
    shutdownStatus: 'Kapalı',
    signal: 'Sinyal',
    simulatorCopyright: 'Telif hakkı (c) Simulator. Tüm hakları saklıdır.',
    simulatorTitle: 'Network Simulator v1.0',
    sizeLabel: 'Boyut',
    skeletonScreens: 'İskelet Ekranlar',
    skip: 'Geç',
    spatialPartitioning: 'Uzamsal Bölümleme',
    speed: 'Hız',
    sshAccess: 'SSH Erişimi',
    startTour: 'Tur',
    static: 'STATIK',
    staticLabel: 'Statik',
    status: 'Durum',
    statusLabel: 'Durum:',
    step1: 'Adım 1: Kaynak',
    step2: 'Adım 2: Hedef',
    stpSwitchesUpdated: 'STP: X switch güncellendi',
    straight: 'Düz',
    straightCable: 'Düz kablo',
    straightShort: 'Düz',
    subnetMask: 'Alt Ağ Maskesi',
    subtitle: 'Ağ Becerilerini Geliştir',
    suggestion: 'Öneri',
    suspended: 'Askıda',
    switchMode: 'Switch Modu',
    switchTasks: 'Görevlere geç',
    switchTerminal: 'switchTerminal',
    switchTitle: 'Network 2960 Switch',
    syslogStarted: '*** Syslog istemcisi başlatıldı',
    tabComplete: 'komut tamamlama',
    tabDescCmd: 'PC Command Prompt (CMD) ile ping, ipconfig vb. komutları çalıştır.',
    tabDescTasks: 'Port, VLAN ve güvenlik görevlerini tamamlayarak puan kazan.',
    tabDescTerminal: 'Switch / router Command Line Interface (CLI) üzerinden yapılandırma komutlarını çalıştır.',
    tabDescTopology: 'Cihazları sürükleyip bırakarak ağ topolojisini tasarla.',
    tabToNext: 'TAB ile sonraki cihaz',
    tabsShort: 'Sekmeler',
    targetGatewayRequired: 'Hedefe erişim için gateway gerekli.',
    taskCompleted: '✓ Görev Tamamlandı',
    taskFailed: '⚠ Görev Başarısız',
    tasks: 'Görevler',
    temperature: 'Sıcaklık',
    termsAndConditions: 'Şartlar ve Koşullar',
    termsText: 'Bu yazılım eğitim amaçlıdır. Ticari olmayan amaçlarla özgürce kullanılabilir ve dağıtılabilir.',
    theme: 'Tema',
    themeLabel: 'Tema',
    tips: '🕸️',
    title: 'Network Simulator',
    togglePower: 'Gücü Aç/Kapat',
    topologyAriaLabel: 'Ağ topolojisi tuvali. Cihazları sürükleyerek taşıyabilirsiniz.',
    topologyInvalidConnections: 'Topoloji: X hatalı bağlantı pasifleştirildi',
    tour: 'Tur',
    turkish: 'Türkçe',
    tutorialCablesDesc: 'Kablo türleri: Straight, PC↔Switch/Router, Crossover - Switch↔Switch/Router↔Router, Console PC↔Cihaz yapılandırma bağlantılar.',
    tutorialCablesTitle: '🔌 Kablo Türleri',
    tutorialDevicesDesc: 'Cihazları aç/kapat (güç düğmesi), yapılandır (CLI/Panel), ve monitör et. CLI sekmesinde komut satırından yapılandırma yapın. Görevler sekmesinde VLAN, port ve güvenlik görevlerini tamamlayın.',
    tutorialDevicesTitle: '💻 Cihaz Yönetimi',
    tutorialPingDesc: 'Ping modu ile cihazlar arası bağlantıyı test edin. Başarılı pingler yeşil, başarısız olanlar kırmızı animasyonla gösterilir. DHCP otomatik IP atama, statik IP için manuel yapılandırma yapın.',
    tutorialPingTitle: '📡 Ping ve Bağlantı Testi',
    tutorialProjectDesc: 'Projeleri kaydet (Ctrl+S), yükle (Ctrl+O) veya yeni başlat (Alt+N). Örnek projeler ile hazır senaryoları inceleyin. Tüm yapılandırmalar JSON formatında kaydedilir.',
    tutorialProjectTitle: '💾 Proje Yönetimi',
    tutorialReadyDesc: 'Artık ağ simülasyonuna başlamaya hazırsınız! Örnek projeleri inceleyin veya kendi topolojinizi oluşturun. Yardım paneli (sağ alt köşe) ve komut referansı her zaman yanınızda. İyi çalışmalar!',
    tutorialReadyTitle: '🚀 Başlamaya Hazırsınız!',
    tutorialThemeDesc: 'Karanlık/Açık tema (🌙/☀️) ve dil (🇹🇷/🇬🇧) tercihlerinizi ayarlayın. Grafik kalitesi düşük/yüksek arasında geçiş yapın. Tüm tercihler tarayıcıda otomatik kaydedilir.',
    tutorialThemeTitle: '🎨 Arayüz Özelleştirme',
    tutorialTopologyDesc: 'Sürükle-bırak ile cihazları yerleştirin. Bağlantı kurmak için: 1) Bağla düğmesine tıkla, 2) Kaynak cihaz/port seç, 3) Hedef cihaz/port seç. Çift tıklama: PC\'de CMD, Switch/Router\'da CLI açar.',
    tutorialTopologyTitle: '📐 Topoloji Editörü',
    tutorialWelcomeDesc: 'Network Simulator\'ya hoş geldiniz! Bu kısa turda temel özellikleri keşfedeceksiniz. Bağlantıları yapılandırın, cihazları yönetin ve ağ becerilerinizi geliştirin.',
    tutorialWelcomeTitle: '🎓 Hoş Geldiniz',
    tutorialWifiDesc: 'Router ve Switch\'leri Access Point moduna alın (WiFi ayarları). SSID, şifreleme (WPA2/WPA3) ve şifre ayarlayın. PC\'ler otomatik olarak erişim noktalarına bağlanır.',
    tutorialWifiTitle: '🌐 WiFi ve Kablosuz',
    typeCommand: 'Komut yazın...',
    typeCommandPlaceholder: 'Enter\'a basın veya yazın...',
    unassigned: 'Atanmamış',
    uncomplete: 'Yinele',
    undo: 'Geri Al',
    unsaved: 'Kaydedilmedi',
    unsavedChangesConfirm: 'Kaydedilmemiş değişiklikler var. Kaydetmek istiyor musunuz?',
    updatePool: 'Havuzu Güncelle',
    uptime: 'Uptime',
    vTaskAssignDesc: 'Bir portu VLAN\'a ata',
    vTaskAssignName: 'Port Ata',
    vTaskCreateDesc: 'Varsayılan olmayan en az 1 VLAN oluştur',
    vTaskCreateName: 'VLAN Oluştur',
    vTaskFullNamingDesc: 'Tüm VLAN\'ları isimlendir',
    vTaskFullNamingHint: 'Her VLAN için: name <isim>',
    vTaskFullNamingName: 'Tam İsimlendirme',
    vTaskMultipleDesc: 'En az 3 kullanıcılı VLAN\'ı oluştur',
    vTaskMultipleName: 'Çoklu VLAN',
    vTaskNameDesc: 'Bir VLAN\'a özel isim ver',
    vTaskNameName: 'VLAN İsimlendir',
    vTaskTrunkDesc: 'Bir portu trunk moduna al',
    vTaskTrunkName: 'Trunk Port',
    viewportCulling: 'Görünüm Alanı Ayıklama',
    virtualScrolling: 'Sanal Kaydırma',
    vlanExcellent: 'Mükemmel VLAN yapılandırması!',
    vlanGood: 'İyi VLAN yapısı',
    vlanId: 'ID (1-4094)',
    vlanInProgress: 'VLAN yapılandırma devam ediyor',
    vlanName: 'İsim',
    vlanNameExample: 'Örn: Muhasebe',
    vlanNeeded: 'VLAN yapılandırması gerekli',
    vlanNotApplicable: 'PC Cihazlarında VLAN Yapılandırması Yok',
    vlanOnlyOnNetworkDevices: 'VLAN bilgileri sadece switch veya router cihazlarında görüntülenebilir ve yapılandırılabilir.',
    vlanScore: 'VLAN Puanı',
    vlanStatus: 'VLAN Durumu',
    vlanTasks: 'VLAN Görevleri',
    vtySecurity: 'VTY Hatları Güvenliği',
    waitingForConnection: 'Bağlantı bekleniyor...',
    wifiAp: 'Erişim Noktası (AP)',
    wifiChannel: 'Kanal',
    wifiClient: 'İstemci',
    wifiConfig: 'WiFi (Wireless Fidelity) Yapılandırması',
    wifiConnected: 'WiFi Bağlı',
    wifiControlPanel: 'WiFi (Wireless Fidelity) Kontrol Paneli',
    wifiDhcpStatusUpdated: '🔄 WiFi + DHCP Durumu Güncellendi',
    wifiDisconnected: 'WiFi Bağlantısı Kesildi',
    wifiMode: 'WiFi Modu',
    wifiOff: 'WiFi Kapalı',
    wifiOn: 'WiFi Açık',
    wifiPassword: 'Şifre',
    wifiSecurity: 'Güvenlik',
    wifiSignal: 'WiFi (Wireless Fidelity) Sinyal Gücü',
    wifiSsid: 'SSID',
    wifiStatus: 'WiFi Durumu',
    wirelessClientsConnected: 'X kablosuz istemci bağlandı',
    wirelessClientsDisconnected: 'X kablosuz istemci bağlantı yok',
    wireless: 'Kablosuz',
    serial: 'Seri',
    wirelessStatus: 'Kablosuz Ağ Durumu',
    yes: 'Evet',
    language: 'tr',
    intermediate: 'Orta Seviye',
    advanced: 'İleri Seviye',
  },
  en: {
    about: 'Help',
    aboutIntro: 'This application is an interactive simulation tool designed for those who want to learn network technologies and terminal commands.',
    aboutTitle: 'About',
    accessDenied: '% Access denied',
    accessibility: 'Accessibility',
    active: 'Active',
    activePorts: 'Active Ports',
    activeSystem: 'Active System',
    add: 'Add',
    addDevice: 'Add Device',
    addDeviceOrCable: 'Add Device or Cable',
    addDevicesFirst: 'Add Devices First',
    addDnsRecord: 'Add Record',
    addIoT: 'Add IoT',
    addFirewall: 'Add Firewall',
    addIotDevice: 'Add IoT device',
    addL2Switch: 'Add L2 Switch',
    addL3Switch: 'Add L3 Switch',
    addNote: 'Add Note',
    addPC: 'Add PC',
    addPc: 'Add PC',
    addPcDevice: 'Add PC device',
    addPcShort: 'Add PC',
    addPool: 'Add Pool',
    addRouter: 'Add Router',
    addRouterShort: 'Add Router',
    addSwitch: 'Add Switch',
    addSwitchShort: 'Add Switch',
    advancedHint: 'Comprehensive setup and verification labs',
    align: 'Align',
    alignLeft: 'Align Left',
    alignCenter: 'Align Center',
    alignRight: 'Align Right',
    alignTop: 'Align Top',
    alignMiddle: 'Align Middle',
    alignBottom: 'Align Bottom',
    allCommands: 'All commands',
    allStepsCompleted: 'All steps completed!',
    annotations: 'Annotations',
    apActive: 'X AP active',
    apNoClients: 'AP has no clients',
    applicationError: 'Application error',
    ariaManagement: 'ARIA Management',
    assetLoading: 'Asset Loading Strategy',
    back: 'Back',
    backgroundGreenhouse: 'Greenhouse Sketch',
    backgroundHouse: 'House Sketch',
    backgroundNone: 'None',
    backgroundTwoStoryGarage: '2-Story Building',
    basicCommands: 'Basic commands',
    basicHint: 'Core commands and first topology steps',
    bathroom: 'Bathroom',
    bedroom: 'Bedroom',
    beginner: 'Beginner',
    blocked: 'Blocked',
    bootInitializing: 'Initializing hardware...',
    bootLoading: 'Loading system...',
    bootReady: 'Ready!',
    bootingFlash: 'Booting from flash...',
    boxSelect: 'Box',
    bugReport: 'Bug Report',
    cable: 'Cable',
    cableType: 'Cable Type',
    cableTypeSelector: 'Cable type selector',
    cableTypes: 'Cable Types',
    cancel: 'Cancel',
    celsius: '°C',
    channelLabel: 'Channel:',
    channelShort: 'Ch',
    clear: 'Clear',
    clearSearch: 'Clear Search',
    clearTerminal: 'Clear Terminal',
    clearTerminalBtn: 'Clear',
    clearTerminalConfirm: 'Terminal output will be cleared. Do you want to continue?',
    cli: 'CLI',
    cliInterface: 'Command Line Interface',
    cliTerminal: 'CLI Terminal',
    clickIconsToRun: 'Click icons to run programs',
    clientsLeased: 'X clients leased',
    close: 'Close',
    closed: 'Closed',
    cmdSuggestions: 'Command suggestions',
    colorLabel: 'Color',
    commandHistory: 'command history',
    commandModes: 'Command Modes:',
    commandPromptTab: 'Command Prompt',
    commandReference: 'Help',
    commandsFound: 'commands found',
    completeWithTab: 'to complete',
    completedAt: 'Completed at',
    configAndMonitor: 'configuration and monitoring panel',
    portStatus: 'Port Status',
    vlanManagement: 'VLAN Management',
    securityAndAcl: 'Security and ACL',
    tasksAndScore: 'Tasks and Scoring',
    configure: 'Configure',
    confirm: 'Confirm',
    confirmReset: 'Reset Device',
    confirmResetDescription: 'This will erase all configuration and restore factory defaults. The device will reload. This action cannot be undone.',
    confirmResetTitle: 'Reset to Factory Defaults?',
    confirmationRequired: 'Confirmation Required',
    congrats: 'Congratulations!',
    connect: 'Connect',
    connectDevices: 'Connect Devices',
    connected: 'Connected',
    connectedLabel: 'Connected:',
    connectedShort: 'connected',
    connectedStatus: 'Connected',
    connectionError: 'Connection error',
    console: 'Console',
    consoleCable: 'Console cable',
    consoleConfiguration: 'Configuration: 9600 bits/s, 8 data bits, no parity',
    consolePasswordErrorDescription: 'Please enter the correct password.',
    consolePasswordErrorTitle: 'Incorrect Password',
    consolePingNotAllowed: 'Ping cannot be sent over a console connection.',
    consoleSecurity: 'Console Security',
    consoleShort: 'Console',
    consoleTab: 'Console',
    consoleTerminal: 'Console Terminal',
    contactEmail: 'Your Email',
    contactErrorDesc: 'A network error occurred. Please try again later.',
    contactErrorTitle: 'Send Failed',
    contactMessage: 'Your Message',
    contactName: 'Your Name',
    contactPlaceholderEmail: 'Enter your email',
    contactPlaceholderMessage: 'Write your message...',
    contactPlaceholderName: 'Enter your name',
    contactSend: 'Send Now',
    contactSuccessDesc: 'Thank you for your feedback!',
    contactSuccessTitle: 'Message Sent',
    contactTitle: 'Contact',
    contactType: 'Topic',
    contactValidationEmail: 'Please enter a valid email',
    contactValidationMessage: 'Please write your message',
    contactValidationName: 'Please enter your name',
    continue: 'Continue',
    copy: 'Copy',
    copyAction: 'Copy',
    copyError: 'Copy failed',
    copySuccess: 'Copied to clipboard',
    copyToastFailureDescription: 'Clipboard access was blocked.',
    copyToastFailureTitle: 'Copy failed',
    copyToastSuccessDescription: 'Output copied to clipboard.',
    copyToastSuccessTitle: 'Copied',
    corruptedProject: 'Project file is corrupted or incompatible!',
    create: 'Create',
    criticalSecurity: 'Critical security vulnerabilities',
    crossover: 'Cross-over',
    crossoverCable: 'Crossover cable',
    crossoverShort: 'Crossover',
    currentStep: 'Current Step',
    cut: 'Cut',
    dark: 'Dark',
    darkMode: 'Dark Mode',
    definedUsers: 'Defined Users',
    delete: 'Delete',
    description: 'Description',
    details: 'Details',
    device: 'Device',
    deviceInfo: 'DEVICE INFO',
    deviceInfoShort: 'Info',
    deviceInformation: 'Device Information',
    deviceName: 'Device Name',
    deviceNameLabel: 'Device Name',
    deviceOff: 'Device Off',
    deviceTasksAndConfig: 'Device tasks and configuration tasks',
    devices: 'Devices',
    devicesCount: 'devices',
    dhcpActiveServers: 'DHCP: X active servers',
    dhcpAssignments: 'DHCP Assignments',
    dhcpCliConfig: 'DHCP pools can be configured via CLI.',
    dhcpEnabled: 'DHCP Enabled',
    dhcpFailureDescription: 'No DHCP server found.',
    dhcpFailureTitle: 'DHCP assignment failed',
    dhcpNoLease: 'client could not get lease',
    dhcpNoPool: 'no pool on server',
    dhcpNotFound: 'No DHCP found',
    dhcpPoolConfig: 'No DHCP pool configuration found.',
    dhcpPoolDnsPlaceholder: 'DNS Server',
    dhcpPoolGatewayPlaceholder: 'Default Gateway',
    dhcpPoolLabel: 'DHCP Pool',
    dhcpPoolMaxUsersPlaceholder: 'Max User',
    dhcpPoolNamePlaceholder: 'Pool Name',
    dhcpPoolStartIpPlaceholder: 'Start IP',
    dhcpPoolSubnetPlaceholder: 'Subnet Mask',
    dhcpPoolsDescription: 'Add, edit and delete DHCP pools.',
    dhcpSuccessDescription: 'Assigned via DHCP: {ip}',
    dhcpSuccessTitle: 'DHCP assignment successful',
    disabled: 'Disabled',
    disconnect: 'Disconnect',
    disconnectAction: 'Disconnect',
    disconnectedStatus: 'Disconnected',
    dnsARecordLabel: 'A Record (Address Record)',
    dnsAddressPlaceholder: 'Address (192.168.1.10)',
    dnsAddressRequired: 'A valid DNS address is required to resolve domain.',
    dnsCnameRecordLabel: 'CNAME Record (Canonical Name Record)',
    dnsDomainPlaceholder: 'Domain (site.local)',
    dnsGatewayRequired: 'Gateway is required to reach DNS server.',
    dnsInvalidAddress: 'DNS address is missing or invalid.',
    dnsNoRecords: 'No DNS records yet.',
    dnsRecordManagerTip: 'Manage domain to IP address records.',
    dnsRecordsLabel: 'DNS (Domain Name System) Records',
    dnsServer: 'DNS Server',
    dontSave: 'Don\'t Save',
    dragToZoomOrScroll: 'Drag to zoom or scroll, single click to return %100 value.',
    distributeHorizontally: 'Distribute Horizontally',
    distributeVertically: 'Distribute Vertically',
    duplex: 'Duplex',
    duplicateLabel: 'Duplicate',
    dynamicRouting: 'Dynamic Routing',
    edit: 'Edit',
    emptyProject: 'Empty Project',
    emptyProjectDesc: 'Start with a clean topology from scratch',
    enableSecret: 'Enable Secret',
    enabled: 'Enabled',
    english: 'English',
    enterPassword: 'Enter password...',
    environmentBackground: 'Background',
    environmentSettings: 'Settings',
    errorPrefix: 'ERROR',
    ethernet: 'Ethernet',
    exam: 'Exam',
    exams: 'Exams',
    startExam: 'Start Exam',
    examMode: 'Exam Mode',
    score: 'Score',
    checklist: 'Checklist',
    examDescription: 'Exam Description',
    finishExam: 'Finish Exam',
    examResult: 'Exam Result',
    examTime: 'Exam Time',
    examCompleted: 'Exam Completed',
    examTasks: 'Exam Tasks',
    examPoints: 'Exam Points',
    examStarted: 'Exam Started',
    examStatus: 'Exam Status',
    exit: 'Exit',
    exitPingMode: 'Exit ping mode (ESC)',
    expand: 'Expand',
    exportLabel: 'Export',
    extractingFiles: 'Extracting files from flash...',
    failedLoadProject: 'Failed to load project file!',
    fastEthernetPorts: 'FastEthernet Ports (Fa0/1 - Fa0/24)',
    fileImportedSuccessfully: 'File imported successfully.',
    finish: 'Finish',
    fontLabel: 'Font',
    fontSizeLabel: 'Size',
    freePorts: 'free ports',
    fullScreen: 'Full Screen',
    gateway: 'Gateway',
    gigabitPorts: 'GigabitEthernet Ports',
    gitAddressLabel: 'Source Address',
    globalConfigLabel: 'Global config',
    goodSecurity: 'Good security level',
    guidedMode: 'Guided Lesson',
    help: 'Help',
    hideHint: 'Hide Hint',
    highContrast: 'High Contrast Support',
    highRes: 'High Resolution',
    hostname: 'Hostname',
    hostnameExample: 'e.g. Router-X',
    httpServerLabel: 'HTTP (Hypertext Transfer Protocol) Server',
    httpServiceDescription: 'When enabled, this PC serves web content.',
    humidity: 'Humidity',
    id: 'ID',
    idle: 'Idle',
    importSuccess: 'File imported successfully.',
    initializingSystem: 'Initializing System...',
    instructions: 'Instructions',
    interfaceConfigLabel: 'Interface config',
    intermediateHint: 'Services, VLAN and routing scenarios',
    invalidDnsAddress: 'Enter a valid DNS address.',
    invalidGatewayAddress: 'Enter a valid gateway address.',
    invalidIpv4Address: 'Enter a valid IPv4 address.',
    invalidIpv6Address: 'Enter a valid IPv6 address.',
    invalidProject: 'Error',
    invalidProjectFile: 'Invalid project file',
    invalidSubnetMask: 'Enter a valid subnet mask.',
    ipAddress: 'IP Address',
    ipConfiguration: 'IP Configuration',
    ipConfigurationLabel: 'IP Configuration',
    ipInterfaces: 'IP Interfaces',
    ipMode: 'IP Mode',
    ipRenew: 'IP Renew',
    ipRouting: 'IP Routing',
    ipRoutingEngine: 'IP Routing Engine',
    jsonDownloaded: 'JSON file downloaded.',
    keyboardNav: 'Keyboard Navigation',
    kitchen: 'Kitchen',
    labProgress: 'Lab Progress',
    languageLabel: 'Language',
    lastSavedAt: 'Saved: ',
    layer3Switching: 'Layer 3 Switching',
    levelAdvanced: 'Advanced Level',
    levelBasic: 'Basic Level',
    levelIntermediate: 'Intermediate Level',
    licenseInfo: 'Tuzla Vocational and Technical Anatolian High School',
    light: 'Light',
    lightLevel: 'Light',
    lightMode: 'Light Mode',
    lines: 'lines',
    linkFrom: 'Link from',
    livingRoom: 'Living Room',
    load: 'Load',
    loadFailed: 'Load failed',
    loadProject: 'Load Project',
    lowRes: 'Low Resolution',
    lowSecurity: 'Low security level',
    macAddress: 'MAC Address',
    measurementLabel: 'Measurement:',
    mediumSecurity: 'Medium security level',
    menu: 'Menu',
    minimize: 'Minimize',
    minutes: 'minutes',
    mode: 'Mode',
    modeConfig: 'Global Config',
    modeInterface: 'Interface Config',
    modeLabel: 'Mode:',
    modeLine: 'Line Config',
    modePrivileged: 'Privileged EXEC',
    modeUser: 'User EXEC',
    modeVlanLabel: 'VLAN Config',
    model: 'Model',
    motionYes: 'Motion Yes',
    navigation: 'Navigation',
    networkRefreshed: 'Network Refreshed',
    networkStatusUpdated: 'Network Status',
    networkTopology: 'Network Topology',
    new: 'New',
    newBtn: 'New',
    newMessage: 'New Message',
    newNote: 'New note...',
    newProject: 'New Project',
    newProjectConfirm: 'All configuration and topology will be reset. Do you want to continue?',
    newVlan: 'Create New VLAN',
    newVlanLabel: 'New VLAN',
    next: 'Next',
    no: 'No',
    noCommandsAvailable: 'No quick commands in this mode',
    noConsoleCableDetected: 'No console cable detected. Connect a console cable from the PC to a network device.',
    noDevicesInTopology: 'No devices in topology yet.',
    noDevicesToList: 'No devices to list.',
    noDhcpPools: 'No DHCP pools yet.',
    noFreePorts: 'No Free Ports',
    noFreePortsMessage: 'Please, disconnect some cables first.',
    noIp: 'No IP',
    noIpInterfaces: 'No interfaces with IP configured.',
    noServices: 'No services',
    noWifiConfig: 'No WiFi configuration found.',
    noWifiDevices: 'No WiFi device found',
    nodePooling: 'Node Pooling',
    none: 'None',
    nosVersion: 'NOS Version',
    notConnected: 'Not Connected',
    note: 'Note',
    noteStyle: 'Note Style',
    of: 'of',
    off: 'OFF',
    on: 'ON',
    opacityLabel: 'Opacity',
    open: 'Open',
    openCLI: 'Open CLI',
    openCMD: 'Open CMD',
    openGuidedLesson: 'Guided Lesson',
    openNewProject: 'New Project',
    openNewProjectDesc: 'Choose a ready scenario to start designing your topology or start with an empty project.',
    openServices: 'Open Services',
    openSourceInfo: 'This project is open-source',
    other: 'Other',
    overview: 'Overview',
    pan: 'Pan',
    passive: 'PASSIVE',
    passwordEncryption: 'Password Encryption',
    paste: 'Paste',
    pcAccessDenied: 'no direct access to address.',
    pcCableError: 'Network cable not connected.',
    pcConnected: 'PC connected',
    pcConnectionClosed: 'Connection closed by foreign host.',
    pcConnectionError: 'Connection error',
    pcConsoleHelp: 'Available commands:\n  enable   - Enter privileged mode\n  exit     - Disconnect from console\n  show     - Show information\n  ?        - Help\n',
    pcConsoleTip: 'Connected via console. Please, use the "terminal" command.',
    pcDisconnected: 'PC disconnected',
    pcIncompatibleCable: 'Incompatible cable type. Straight-through required for PC-Switch.',
    pcIpconfigError: 'Could not retrieve IP configuration.',
    pcLoginSuccess: 'Login successful',
    pcNoDeviceConnected: 'No device connected',
    pcNotConnected: 'You are not connected to any switch or router.',
    pcNslookupError: 'NSLOOKUP: Cannot communicate with DNS server.',
    pcPingError: 'Ping request timed out.',
    pcTelnetError: 'TELNET: Connection failed.',
    pcTerminal: 'PC Terminal',
    pcTerminalClosing: 'Closing PC terminal...',
    pcTracertError: 'TRACERT: Target unreachable.',
    percent: '%',
    fullscreen: 'Fullscreen',
    gridSnapping: 'Grid Snapping',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    performanceOptimization: 'Performance Optimization',
    physicalConnectionDetected: 'Physical connection detected to',
    ping: 'Ping',
    pingFailed: 'Ping failed',
    pingSuccess: 'Ping successful',
    pools: 'Pools',
    portClickTip: 'Click on port LEDs to quickly switch to interface mode',
    portInUse: 'This port already in use!',
    portName: 'Name',
    portSecurityBlocked: 'Port Security: X blocked, Y recovered',
    portSummary: 'Port Summary',
    ports: 'Ports',
    portsShort: 'Ports',
    power: 'Power',
    powerOff: 'Power Off',
    powerOn: 'Power On',
    pressEnterToConfirm: 'Press Enter to confirm',
    processing: 'Processing...',
    progress: 'Progress',
    project: 'Project',
    projectLoaded: 'Project loaded',
    projectSaved: 'Project saved',
    pts: 'pts',
    quickActions: 'Quick actions',
    quickCommands: 'Quick Commands',
    quickSettings: 'Quick Settings',
    quickSettingsAndTasks: 'Tasks',
    realTimeUpdate: 'Real-time update active',
    redo: 'Redo',
    refresh: 'Refresh',
    refreshNetwork: 'Refresh Network',
    refreshNetworkF5: 'Refresh Network',
    reload: 'Reload',
    reloadPage: 'Reload page',
    rename: 'Rename',
    reset: 'Reset',
    resetConfirm: 'All configuration will be reset. Do you want to continue?',
    resetToDefaults: 'Reset to Defaults',
    resetView: 'Reset',
    resize: 'Resize',
    resizeAction: 'Resize',
    resizeLabel: 'Resize',
    room1: 'Room 1',
    room2: 'Room 2',
    routedPorts: 'Routed Ports',
    routerInfoPanel: 'Router Information Panel',
    routing: 'Routing',
    routingTasks: 'Routing Tasks',
    runningConfig: 'Running-Config',
    save: 'Save (wr)',
    saveError: 'Error occurred while saving',
    saveLabel: 'Save',
    saveProject: 'Save Project',
    saveSuccess: 'Configuration saved successfully',
    saved: 'Saved',
    savedViaSheets: 'Share your ideas',
    saving: 'Saving...',
    screenReader: 'Screen Reader Announcements',
    search: 'Search',
    searchOutputDescription: 'Matches will be highlighted in the output.',
    searchOutputTitle: 'Search output',
    searchPlaceholder: 'Search...',
    searchProjects: 'Search projects...',
    searchShort: 'Search...',
    searchTerminal: 'Search in terminal output',
    secConsoleOff: 'Console line login not configured',
    secConsoleOn: 'Console line login enabled',
    secEnableSecretOff: 'Enable password not configured',
    secEnableSecretOn: 'Encrypted enable password configured',
    secNoProtocol: 'Access protocol not configured',
    secPassEncOff: 'Passwords stored in plain text',
    secPassEncOn: 'Passwords encrypted',
    secSshOnly: 'SSH-only access enabled',
    secTelnetWarn: 'Telnet access enabled (insecure)',
    secVtyOff: 'VTY lines login not configured',
    secVtyOn: 'VTY lines login enabled',
    securityControls: 'Security Controls',
    securityLabel: 'Security:',
    securityLevel: 'Security Level',
    selectAll: 'Select All',
    selectCable: 'Select Cable',
    selectDevice: 'Select Device',
    selectDeviceDropdown: 'Select Device',
    selectSource: 'Select source',
    selectSourcePort: 'Select Source Port',
    selectTarget: 'Select target',
    selectTargetPort: 'Select Target Port',
    sending: 'Sending...',
    services: 'Services',
    servicesTab: 'Services',
    settings: 'Settings',
    settingsTab: 'Settings',
    showHidePassword: 'Show/Hide password',
    showHint: 'Show Hint',
    holdToDrag: 'Hold to drag',
    shutdownStatus: 'Shutdown',
    signal: 'Signal',
    simulatorCopyright: 'Copyright (c) Simulator. All rights reserved.',
    simulatorTitle: 'Network Simulator v1.0',
    sizeLabel: 'Size',
    skeletonScreens: 'Skeleton Screens',
    skip: 'Skip',
    spatialPartitioning: 'Spatial Partitioning',
    speed: 'Speed',
    sshAccess: 'SSH Access',
    startTour: 'Tour',
    static: 'STATIC',
    staticLabel: 'Static',
    status: 'Status',
    statusLabel: 'Status:',
    step1: 'Step 1: Source',
    step2: 'Step 2: Destination',
    stpSwitchesUpdated: 'STP: X switches updated',
    straight: 'Straight',
    straightCable: 'Straight cable',
    straightShort: 'Straight',
    subnetMask: 'Subnet Mask',
    subtitle: 'Develop Your Networking Skills',
    suggestion: 'Suggestion',
    suspended: 'Suspended',
    switchMode: 'Switch Mode',
    switchTasks: 'Switch to Tasks',
    switchTerminal: 'switchTerminal',
    switchTitle: 'Network 2960 Switch',
    syslogStarted: '*** Syslog client started',
    tabComplete: 'command completion',
    tabDescCmd: 'Run commands like ping, ipconfig, etc. via PC Command Prompt (cmd).',
    tabDescTasks: 'Earn points by completing port, VLAN and security tasks.',
    tabDescTerminal: 'Run configuration commands via Switch / router Command Line Interface (CLI).',
    tabDescTopology: 'Design the network topology by dragging and dropping devices.',
    tabToNext: 'TAB for next device',
    tabsShort: 'Tabs',
    targetGatewayRequired: 'Gateway is required to reach target.',
    taskCompleted: '✓ Task Completed',
    taskFailed: '⚠ Task Failed',
    tasks: 'Tasks',
    temperature: 'Temperature',
    termsAndConditions: 'Terms and Conditions',
    termsText: 'This software is for educational purposes. It can be freely used and distributed for non-commercial purposes.',
    theme: 'Theme',
    themeLabel: 'Theme',
    tips: '🕸️',
    title: 'Network Simulator',
    togglePower: 'Toggle Power',
    topologyAriaLabel: 'Network topology canvas. You can drag devices to move them.',
    topologyInvalidConnections: 'Topology: X invalid connections disabled',
    tour: 'Tour',
    turkish: 'Türkçe',
    tutorialCablesDesc: 'Cable types: Straight,  PC↔Switch/Router, Crossover - Switch↔Switch/Router↔Router, Console - PC↔Device config connections.',
    tutorialCablesTitle: '🔌 Cable Types',
    tutorialDevicesDesc: 'Power on/off devices (power button), configure (CLI/Panel), and monitor. Use CLI tab for command-line configuration. Complete VLAN, port and security tasks in Tasks tab.',
    tutorialDevicesTitle: '💻 Device Management',
    tutorialPingDesc: 'Test connectivity with Ping mode. Successful pings show green, failed ones show red animation. DHCP auto-assigns IPs, or configure static IPs manually.',
    tutorialPingTitle: '📡 Ping Connectivity',
    tutorialProjectDesc: 'Save (Ctrl+S), load (Ctrl+O), or start new projects (Alt+N). Explore ready scenarios with example projects. All configurations are saved in JSON format.',
    tutorialProjectTitle: '💾 Project Management',
    tutorialReadyDesc: 'You\'re now ready to start network simulation! Explore example projects or create your own topology. Help panel (bottom-right) and command reference are always available. Good luck!',
    tutorialReadyTitle: '🚀 You\'re Ready!',
    tutorialThemeDesc: 'Set Dark/Light theme (🌙/☀️) and language (🇹🇷/🇬🇧) preferences. Toggle graphics quality between low/high. All preferences are automatically saved in browser.',
    tutorialThemeTitle: '🎨 Interface Customization',
    tutorialTopologyDesc: 'Drag and drop to position devices. To connect: 1) Click Connect button, 2) Select source device/port, 3) Select target device/port. Double-click: Opens CMD on PC, CLI on Switch/Router.',
    tutorialTopologyTitle: '📐 Topology Editor',
    tutorialWelcomeDesc: 'Welcome to Network Simulator! This quick tour will show you the essential features. Configure connections, manage devices, and develop your networking skills.',
    tutorialWelcomeTitle: '🎓 Welcome',
    tutorialWifiDesc: 'Set Routers and Switches to Access Point mode (WiFi settings). Configure SSID, encryption (WPA2/WPA3) and password. PCs automatically connect to available access points.',
    tutorialWifiTitle: '🌐 WiFi Wireless',
    typeCommand: 'Type command...',
    typeCommandPlaceholder: 'Press Enter or type...',
    unassigned: 'Unassigned',
    uncomplete: 'Redo',
    undo: 'Undo',
    unsaved: 'Unsaved',
    unsavedChangesConfirm: 'You have unsaved changes. Do you want to save?',
    updatePool: 'Update Pool',
    uptime: 'Uptime',
    vTaskAssignDesc: 'Assign a port to a VLAN',
    vTaskAssignName: 'Assign Port',
    vTaskCreateDesc: 'Create at least 1 non-default VLAN',
    vTaskCreateName: 'Create VLAN',
    vTaskFullNamingDesc: 'Name all VLANs properly',
    vTaskFullNamingHint: 'For each VLAN: name <name>',
    vTaskFullNamingName: 'Full Naming',
    vTaskMultipleDesc: 'Create at least 3 user VLANs',
    vTaskMultipleName: 'Multiple VLANs',
    vTaskNameDesc: 'Give a custom name to a VLAN',
    vTaskNameName: 'Name VLAN',
    vTaskTrunkDesc: 'Configure a port as trunk',
    vTaskTrunkName: 'Trunk Port',
    viewportCulling: 'Viewport Culling',
    virtualScrolling: 'Virtual Scrolling',
    vlanExcellent: 'Excellent VLAN configuration!',
    vlanGood: 'Good VLAN structure',
    vlanId: 'ID (1-4094)',
    vlanInProgress: 'VLAN configuration in progress',
    vlanName: 'Name',
    vlanNameExample: 'e.g. Sales',
    vlanNeeded: 'VLAN configuration needed',
    vlanNotApplicable: 'VLAN Configuration Not Applicable for PC Devices',
    vlanOnlyOnNetworkDevices: 'VLAN information can only be viewed and configured on switch or router devices.',
    vlanScore: 'VLAN Score',
    vlanStatus: 'VLAN Status',
    vlanTasks: 'VLAN Tasks',
    vtySecurity: 'VTY Lines Security',
    waitingForConnection: 'Waiting for connection...',
    wifiAp: 'Access Point (AP)',
    wifiChannel: 'Channel',
    wifiClient: 'Client',
    wifiConfig: 'WiFi (Wireless Fidelity) Configuration',
    wifiConnected: 'WiFi Connected',
    wifiControlPanel: 'WiFi (Wireless Fidelity) Control Panel',
    wifiDhcpStatusUpdated: '🔄 WiFi + DHCP Status Updated',
    wifiDisconnected: 'WiFi Disconnected',
    wifiMode: 'WiFi Mode',
    wifiOff: 'WiFi Off',
    wifiOn: 'WiFi On',
    wifiPassword: 'Password',
    wifiSecurity: 'Security',
    wifiSignal: 'WiFi (Wireless Fidelity) Signal Strength',
    wifiSsid: 'SSID',
    wifiStatus: 'WiFi Status',
    wirelessClientsConnected: 'X wireless clients connected',
    wirelessClientsDisconnected: 'X wireless clients disconnected',
    wireless: 'Wireless',
    serial: 'Serial',
    wirelessStatus: 'Wireless Status',
    yes: 'Yes',
    language: 'en',
    intermediate: 'Intermediate Level',
    advanced: 'Advanced Level',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Sistem dilini algılar ve desteklenen dile dönüştürür
 * Türkçe (tr) ve İngilizce (en) desteklenir
 */
function getSystemLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();

  // Türkçe varyantlarını kontrol et (tr, tr-TR, tr-CY, vb.)
  if (browserLang.startsWith('tr')) {
    return 'tr';
  }

  // Varsayılan olarak İngilizce döndür
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && (saved === 'tr' || saved === 'en')) {
      setLanguage(saved);
    } else {
      // Sistem dilini algıla ve kullan
      const systemLang = getSystemLanguage();
      setLanguage(systemLang);
      localStorage.setItem('language', systemLang);
    }
    setMounted(true);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  if (!mounted) {
    return <></>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

