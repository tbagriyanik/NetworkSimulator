import React from 'react';

interface CanvasDefsProps {
  isDark: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export const CanvasDefs: React.FC<CanvasDefsProps> = ({
  isDark,
  canvasWidth,
  canvasHeight
}) => {
  return (
    <defs>
      <clipPath id="canvasClip">
        <rect x="0" y="0" width={canvasWidth} height={canvasHeight} />
      </clipPath>
      {/* Device Shadow Filter */}
      <filter id="deviceShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity={isDark ? "0.15" : "0.1"} />
      </filter>
      {/* WiFi Icon Shadow Filter */}
      <filter id="wifiIconShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodOpacity={isDark ? "0.4" : "0.25"} />
      </filter>
      {/* Canvas background gradient */}
      <radialGradient id="canvasBgGradient" cx="46%" cy="30%" r="88%">
        {isDark ? (
          <>
            <stop offset="0%" stopColor="#24344d" />
            <stop offset="28%" stopColor="#1e2c43" />
            <stop offset="55%" stopColor="#18253a" />
            <stop offset="78%" stopColor="#142033" />
            <stop offset="100%" stopColor="#0d1728" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#fcfdff" />
            <stop offset="28%" stopColor="#f6faff" />
            <stop offset="55%" stopColor="#eef4fc" />
            <stop offset="78%" stopColor="#e7eff9" />
            <stop offset="100%" stopColor="#dde8f4" />
          </>
        )}
      </radialGradient>
      {/* Grid pattern with improved visibility */}
      <pattern id="gridPattern" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="8" r="1" style={{ fill: isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-500)' }} opacity="0.6" />
      </pattern>
      {/* Major grid lines pattern */}
      <pattern id="majorGridPattern" width="80" height="80" patternUnits="userSpaceOnUse">
        <rect width="80" height="80" fill="none" style={{ stroke: isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-300)' }} strokeWidth="0.5" opacity="0.3" />
      </pattern>
      {/* Device 3D Gradients for Dark Mode */}
      <linearGradient id="pcGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-600)" />
        <stop offset="30%" stopColor="var(--color-primary-800)" />
        <stop offset="100%" stopColor="var(--color-primary-900)" />
      </linearGradient>
      <linearGradient id="switchGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-400)" />
        <stop offset="30%" stopColor="var(--color-accent-600)" />
        <stop offset="100%" stopColor="var(--color-accent-800)" />
      </linearGradient>
      <linearGradient id="routerGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-500)" />
        <stop offset="30%" stopColor="var(--color-purple-700)" />
        <stop offset="100%" stopColor="var(--color-purple-900)" />
      </linearGradient>
      <linearGradient id="firewallGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-error-500)" />
        <stop offset="30%" stopColor="var(--color-error-600)" />
        <stop offset="100%" stopColor="var(--color-error-800)" />
      </linearGradient>
      <linearGradient id="iotGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-400)" />
        <stop offset="30%" stopColor="var(--color-warning-600)" />
        <stop offset="100%" stopColor="var(--color-warning-700)" />
      </linearGradient>
      {/* Device 3D Gradients for Light Mode */}
      <linearGradient id="pcGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-50)" />
        <stop offset="100%" stopColor="var(--color-primary-100)" />
      </linearGradient>
      <linearGradient id="switchGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-50)" />
        <stop offset="100%" stopColor="var(--color-accent-200)" />
      </linearGradient>
      <linearGradient id="routerGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-50)" />
        <stop offset="100%" stopColor="var(--color-purple-100)" />
      </linearGradient>
      <linearGradient id="firewallGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-error-100)" />
        <stop offset="100%" stopColor="var(--color-error-200)" />
      </linearGradient>
      <linearGradient id="iotGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-50)" />
        <stop offset="100%" stopColor="var(--color-warning-200)" />
      </linearGradient>
      <linearGradient id="wlcGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-400)" />
        <stop offset="30%" stopColor="var(--color-warning-600)" />
        <stop offset="100%" stopColor="var(--color-warning-700)" />
      </linearGradient>
      <linearGradient id="wlcGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-50)" />
        <stop offset="100%" stopColor="var(--color-warning-100)" />
      </linearGradient>
      {/* Note Gradients for Dark Mode */}
      <linearGradient id="noteBlueDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-500)" />
        <stop offset="100%" stopColor="var(--color-primary-700)" />
      </linearGradient>
      <linearGradient id="noteEmeraldDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-500)" />
        <stop offset="100%" stopColor="var(--color-success-700)" />
      </linearGradient>
      <linearGradient id="noteVioletDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-500)" />
        <stop offset="100%" stopColor="var(--color-purple-700)" />
      </linearGradient>
      <linearGradient id="noteAmberDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-500)" />
        <stop offset="100%" stopColor="var(--color-warning-700)" />
      </linearGradient>
      <linearGradient id="noteRedDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-error-500)" />
        <stop offset="100%" stopColor="var(--color-error-700)" />
      </linearGradient>
      <linearGradient id="noteCyanDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-500)" />
        <stop offset="100%" stopColor="var(--color-accent-700)" />
      </linearGradient>
      <linearGradient id="notePinkDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-pink-500)" />
        <stop offset="100%" stopColor="var(--color-pink-700)" />
      </linearGradient>
      <linearGradient id="noteOrangeDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-400)" />
        <stop offset="100%" stopColor="var(--color-warning-700)" />
      </linearGradient>
      <linearGradient id="noteLimeDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-500)" />
        <stop offset="100%" stopColor="var(--color-success-700)" />
      </linearGradient>
      <linearGradient id="noteSlateDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-secondary-500)" />
        <stop offset="100%" stopColor="var(--color-secondary-700)" />
      </linearGradient>
      <linearGradient id="notePurpleDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-400)" />
        <stop offset="100%" stopColor="var(--color-purple-600)" />
      </linearGradient>
      <linearGradient id="noteLightBlueDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-400)" />
        <stop offset="100%" stopColor="var(--color-primary-600)" />
      </linearGradient>
      <linearGradient id="noteLightGreenDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-400)" />
        <stop offset="100%" stopColor="var(--color-success-600)" />
      </linearGradient>
      {/* Note Gradients for Light Mode */}
      <linearGradient id="noteBlueLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-100)" />
        <stop offset="100%" stopColor="var(--color-primary-200)" />
      </linearGradient>
      <linearGradient id="noteEmeraldLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-100)" />
        <stop offset="100%" stopColor="var(--color-success-200)" />
      </linearGradient>
      <linearGradient id="noteVioletLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-100)" />
        <stop offset="100%" stopColor="var(--color-purple-200)" />
      </linearGradient>
      <linearGradient id="noteAmberLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-100)" />
        <stop offset="100%" stopColor="var(--color-warning-200)" />
      </linearGradient>
      <linearGradient id="noteRedLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-error-100)" />
        <stop offset="100%" stopColor="var(--color-error-200)" />
      </linearGradient>
      <linearGradient id="noteCyanLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-100)" />
        <stop offset="100%" stopColor="var(--color-accent-200)" />
      </linearGradient>
      <linearGradient id="notePinkLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-pink-100)" />
        <stop offset="100%" stopColor="var(--color-pink-200)" />
      </linearGradient>
      <linearGradient id="noteOrangeLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-warning-50)" />
        <stop offset="100%" stopColor="var(--color-warning-200)" />
      </linearGradient>
      <linearGradient id="noteLimeLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-50)" />
        <stop offset="100%" stopColor="var(--color-success-200)" />
      </linearGradient>
      <linearGradient id="noteSlateLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-secondary-100)" />
        <stop offset="100%" stopColor="var(--color-secondary-200)" />
      </linearGradient>
      <linearGradient id="notePurpleLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-purple-100)" />
        <stop offset="100%" stopColor="var(--color-purple-200)" />
      </linearGradient>
      <linearGradient id="noteLightBlueLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-primary-100)" />
        <stop offset="100%" stopColor="var(--color-primary-200)" />
      </linearGradient>
      <linearGradient id="noteLightGreenLight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-success-100)" />
        <stop offset="100%" stopColor="var(--color-success-200)" />
      </linearGradient>
    </defs>
  );
};
