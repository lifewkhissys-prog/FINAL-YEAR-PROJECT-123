import React from 'react';
import { motion } from 'framer-motion';

export function TechnicalPulseChart({ color = 'var(--accent)', height = 40, className = '' }) {
  // Generate random-ish points for a technical look
  const points = [
    { x: 0, y: 30 },
    { x: 10, y: 25 },
    { x: 20, y: 35 },
    { x: 30, y: 15 },
    { x: 40, y: 20 },
    { x: 50, y: 5 },
    { x: 60, y: 15 },
    { x: 70, y: 10 },
    { x: 80, y: 25 },
    { x: 90, y: 20 },
    { x: 100, y: 30 },
  ];
  const startPoint = points[0] || { x: 0, y: 0 };

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaData = `${pathData} L 100,40 L 0,40 Z`;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <svg 
        viewBox="0 0 100 40" 
        className="w-full h-full preserve-3d"
        preserveAspectRatio="none"
      >
        {/* Area Gradient */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1 }}
          d={areaData}
          fill={color}
        />
        
        {/* The Pulse Line */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Scanning Dot */}
        <motion.circle
          r="2"
          fill={color}
          initial={{ opacity: 0, cx: startPoint.x, cy: startPoint.y }}
          animate={{ 
            opacity: [0, 1, 0],
            cx: points.map(p => p.x),
            cy: points.map(p => p.y)
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </svg>
    </div>
  );
}
