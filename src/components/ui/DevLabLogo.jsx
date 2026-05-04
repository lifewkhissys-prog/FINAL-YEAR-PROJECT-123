import React from 'react';

/**
 * DevLabLogo Component
 * 
 * Renders the custom DevLab brand logo with bracket mark design.
 * 
 * @param {string} size - Logo size: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (96px)
 * @param {boolean} mono - If true, renders white variant for dark backgrounds
 * @param {string} className - Additional CSS classes
 */
const DevLabLogo = ({ size = 'sm', mono = false, className = '' }) => {
  // Size mapping
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const height = sizeMap[size] || sizeMap.sm;
  const width = height * 2.5; 

  // Calculate dimensions based on height
  const markSize = height * 0.6;
  const markX = (height - markSize) / 2;
  const markY = (height - markSize) / 2;
  const fontSize = height * 0.35;
  const markStartX = markX + height * 0.3;
  const accentSize = markSize * 0.15;

  // Colors
  const markColor = 'var(--accent)';
  const textForeground = 'var(--text-primary)';
  const textAccent = 'var(--accent)';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={`devlab-logo devlab-logo--${size} ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Bracket Mark */}
      <g className="devlab-mark">
        {/* Left vertical arm */}
        <line
          x1={markStartX}
          y1={markY}
          x2={markStartX}
          y2={markY + markSize}
          stroke={markColor}
          strokeWidth={markSize * 0.12}
          strokeLinecap="round"
        />

        {/* Top horizontal arm */}
        <line
          x1={markStartX}
          y1={markY}
          x2={markStartX + markSize * 0.6}
          y2={markY}
          stroke={markColor}
          strokeWidth={markSize * 0.12}
          strokeLinecap="round"
        />

        {/* Bottom horizontal arm */}
        <line
          x1={markStartX}
          y1={markY + markSize}
          x2={markStartX + markSize * 0.6}
          y2={markY + markSize}
          stroke={markColor}
          strokeWidth={markSize * 0.12}
          strokeLinecap="round"
        />

        {/* Top-right angle stroke */}
        <line
          x1={markStartX + markSize * 0.6}
          y1={markY}
          x2={markStartX + markSize * 0.75}
          y2={markY + markSize * 0.15}
          stroke={markColor}
          strokeWidth={markSize * 0.12}
          strokeLinecap="round"
        />

        {/* Bottom-right angle stroke */}
        <line
          x1={markStartX + markSize * 0.6}
          y1={markY + markSize}
          x2={markStartX + markSize * 0.75}
          y2={markY + markSize * 0.85}
          stroke={markColor}
          strokeWidth={markSize * 0.12}
          strokeLinecap="round"
        />

        {/* Accent square */}
        <rect
          x={markStartX + markSize * 0.4}
          y={markY + markSize * 0.35}
          width={accentSize}
          height={accentSize}
          fill={markColor}
        />
      </g>

      {/* Wordmark */}
      <g className="devlab-wordmark">
        <text
          x={markStartX + markSize + height * 0.15}
          y={markY + markSize * 0.65}
          fontSize={fontSize}
          fontFamily="'DM Sans', sans-serif"
          fontWeight="800"
          fill={textForeground}
          dominantBaseline="middle"
          letterSpacing="-0.02em"
        >
          Dev
        </text>

        <text
          x={markStartX + markSize + height * 0.15 + fontSize * 1.8}
          y={markY + markSize * 0.65}
          fontSize={fontSize}
          fontFamily="'DM Sans', sans-serif"
          fontWeight="400"
          fill={textAccent}
          dominantBaseline="middle"
          letterSpacing="-0.02em"
        >
          Lab
        </text>
      </g>
    </svg>
  );
};

export default DevLabLogo;
