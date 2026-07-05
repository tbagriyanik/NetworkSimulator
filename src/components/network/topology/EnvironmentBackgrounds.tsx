import React from 'react';

interface EnvironmentBackgroundsProps {
  environment?: { background?: string | 'none' | 'house' | 'twoStoryGarage' | 'greenhouse' } | null;
  isDark: boolean;
  t: Record<string, string>;
}

export const EnvironmentBackgrounds: React.FC<EnvironmentBackgroundsProps> = ({
  environment,
  isDark,
  t
}) => {
  if (!environment || environment.background === 'none') {
    return null;
  }

  return (
    <g opacity="0.15">
      {environment.background === 'house' && (
        <svg x="0" y="0" width="1200" height="900" viewBox="0 0 1200 900">
          {/* 3+1 Apartment - Top-down floor plan */}
          <g fill="none" style={{ stroke: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} strokeWidth="6">
            {/* Outer walls */}
            <rect x="150" y="150" width="900" height="600" rx="6" />
            {/* Living room (large room at bottom) */}
            <rect x="150" y="450" width="450" height="300" rx="4" />
            {/* Kitchen (right of living room) */}
            <rect x="600" y="450" width="450" height="300" rx="4" />
            {/* Kitchen counter */}
            <rect x="870" y="470" width="150" height="60" rx="4" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} />
            {/* Bedroom 1 (top left) */}
            <rect x="150" y="150" width="300" height="300" rx="4" />
            {/* Bedroom 2 (top middle) */}
            <rect x="450" y="150" width="300" height="300" rx="4" />
            {/* Bedroom 3 (top right) */}
            <rect x="750" y="150" width="300" height="300" rx="4" />
            {/* Bathroom (small room between living and bedrooms) */}
            <rect x="600" y="360" width="150" height="90" rx="4" />
            {/* Hallway */}
            <rect x="450" y="360" width="150" height="90" rx="4" />
            {/* Entrance door */}
            <rect x="330" y="690" width="90" height="60" rx="4" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} />
            <line x1="375" y1="690" x2="375" y2="750" strokeDasharray="10,10" />
            {/* Bedroom doors */}
            <line x1="300" y1="450" x2="360" y2="450" strokeDasharray="10,10" />
            <line x1="600" y1="450" x2="660" y2="450" strokeDasharray="10,10" />
            <line x1="900" y1="450" x2="960" y2="450" strokeDasharray="10,10" />
            {/* Kitchen doorway */}
            <line x1="600" y1="540" x2="600" y2="660" strokeDasharray="10,10" />
            {/* Bathroom door */}
            <line x1="660" y1="405" x2="690" y2="405" strokeDasharray="10,10" />
            {/* Room labels */}
            <text x="300" y="330" fontSize="40" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.room1 || 'Oda 1'}</text>
            <text x="600" y="330" fontSize="40" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.room2 || 'Oda 2'}</text>
            <text x="900" y="330" fontSize="40" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.bedroom || 'Yatak Odası'}</text>
            <text x="375" y="630" fontSize="40" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.livingRoom || 'Salon'}</text>
            <text x="825" y="630" fontSize="40" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.kitchen || 'Mutfak'}</text>
            <text x="675" y="420" fontSize="28" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} textAnchor="middle">{t?.bathroom || 'Banyo'}</text>
          </g>
        </svg>
      )}
      {environment.background === 'twoStoryGarage' && (
        <svg x="0" y="0" width="1500" height="1200" viewBox="0 0 1500 1200">
          {/* Two story building with garage */}
          <g fill="none" style={{ stroke: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} strokeWidth="6">
            {/* Main building - 2 stories */}
            <rect x="150" y="240" width="600" height="720" rx="6" />
            {/* First floor line */}
            <line x1="150" y1="600" x2="750" y2="600" />
            {/* Roof */}
            <path d="M120 240 L450 60 L780 240" />
            {/* Main entrance door */}
            <rect x="390" y="660" width="120" height="300" rx="6" />
            <circle cx="450" cy="810" r="9" style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} />
            {/* First floor windows - 3 windows */}
            <rect x="210" y="390" width="135" height="150" rx="6" />
            <line x1="276" y1="390" x2="276" y2="540" />
            <line x1="210" y1="465" x2="345" y2="465" />
            <rect x="381" y="390" width="135" height="150" rx="6" />
            <line x1="447" y1="390" x2="447" y2="540" />
            <line x1="381" y1="465" x2="516" y2="465" />
            <rect x="555" y="390" width="135" height="150" rx="6" />
            <line x1="621" y1="390" x2="621" y2="540" />
            <line x1="555" y1="465" x2="690" y2="465" />
            {/* Ground floor windows */}
            <rect x="210" y="690" width="135" height="210" rx="6" />
            <line x1="276" y1="690" x2="276" y2="900" />
            <line x1="210" y1="795" x2="345" y2="795" />
            <rect x="555" y="690" width="135" height="210" rx="6" />
            <line x1="621" y1="690" x2="621" y2="900" />
            <line x1="555" y1="795" x2="690" y2="795" />
            {/* Attached garage */}
            <rect x="810" y="540" width="480" height="420" rx="6" />
            {/* Garage roof */}
            <path d="M810 540 L1050 420 L1290 540" />
            {/* Garage door */}
            <rect x="930" y="660" width="240" height="300" rx="3" />
            <line x1="930" y1="735" x2="1170" y2="735" />
            <line x1="930" y1="810" x2="1170" y2="810" />
            <line x1="930" y1="885" x2="1170" y2="885" />
            {/* Garage side window */}
            <rect x="855" y="630" width="60" height="90" rx="6" />
            <line x1="885" y1="630" x2="885" y2="720" />
            <line x1="855" y1="675" x2="915" y2="675" />
            {/* Chimney */}
            <rect x="600" y="105" width="75" height="150" rx="6" />
            <ellipse cx="637.5" cy="90" rx="36" ry="12" />
          </g>
        </svg>
      )}
      {environment.background === 'greenhouse' && (
        <svg x="0" y="0" width="1600" height="1200" viewBox="0 0 1600 1200">
          {/* Greenhouse / Sera Layout */}
          <g fill="none" style={{ stroke: isDark ? 'var(--color-success-600)' : 'var(--color-success-700)' }} strokeWidth="6">
            {/* Main greenhouse structure - rectangular with curved roof */}
            <rect x="200" y="300" width="1200" height="600" rx="12" />
            {/* Arched roof frame */}
            <path d="M200 300 Q800 150 1400 300" />
            <path d="M200 300 Q800 180 1400 300" />
            <path d="M200 300 Q800 210 1400 300" />

            {/* Support columns */}
            <line x1="350" y1="300" x2="350" y2="900" />
            <line x1="500" y1="300" x2="500" y2="900" />
            <line x1="650" y1="300" x2="650" y2="900" />
            <line x1="800" y1="300" x2="800" y2="900" />
            <line x1="950" y1="300" x2="950" y2="900" />
            <line x1="1100" y1="300" x2="1100" y2="900" />
            <line x1="1250" y1="300" x2="1250" y2="900" />

            {/* Horizontal support beams */}
            <line x1="200" y1="450" x2="1400" y2="450" />
            <line x1="200" y1="600" x2="1400" y2="600" />
            <line x1="200" y1="750" x2="1400" y2="750" />

            {/* Main entrance */}
            <rect x="700" y="750" width="200" height="150" rx="6" />
            <line x1="800" y1="750" x2="800" y2="900" />
            <circle cx="780" cy="825" r="8" style={{ fill: isDark ? 'var(--color-success-600)' : 'var(--color-success-700)' }} />

            {/* Ventilation windows on roof */}
            <rect x="400" y="240" width="120" height="60" rx="6" />
            <rect x="600" y="210" width="120" height="60" rx="6" />
            <rect x="800" y="195" width="120" height="60" rx="6" />
            <rect x="1000" y="210" width="120" height="60" rx="6" />
            <rect x="1200" y="240" width="120" height="60" rx="6" />

            {/* Plant rows inside */}
            <g style={{ stroke: isDark ? 'var(--color-success-500)' : 'var(--color-success-600)' }} strokeWidth="4">
              <line x1="275" y1="400" x2="275" y2="700" />
              <line x1="425" y1="400" x2="425" y2="700" />
              <line x1="575" y1="400" x2="575" y2="700" />
              <line x1="1025" y1="400" x2="1025" y2="700" />
              <line x1="1175" y1="400" x2="1175" y2="700" />
              <line x1="1325" y1="400" x2="1325" y2="700" />
            </g>

            {/* Irrigation pipes */}
            <g style={{ stroke: isDark ? 'var(--color-primary-600)' : 'var(--color-primary-700)' }} strokeWidth="3" strokeDasharray="10,5">
              <line x1="200" y1="500" x2="1400" y2="500" />
              <line x1="200" y1="650" x2="1400" y2="650" />
            </g>

            {/* Control room / IoT hub */}
            <rect x="1300" y="200" width="200" height="150" rx="8" />
            <rect x="1350" y="250" width="100" height="60" rx="4" />
            <circle cx="1400" cy="280" r="20" style={{ stroke: isDark ? 'var(--color-warning-500)' : 'var(--color-warning-600)' }} strokeWidth="3" />
            <line x1="1385" y1="280" x2="1415" y2="280" style={{ stroke: isDark ? 'var(--color-warning-500)' : 'var(--color-warning-600)' }} strokeWidth="3" />
            <line x1="1400" y1="265" x2="1400" y2="295" style={{ stroke: isDark ? 'var(--color-warning-500)' : 'var(--color-warning-600)' }} strokeWidth="3" />
          </g>
        </svg>
      )}
    </g>
  );
};
