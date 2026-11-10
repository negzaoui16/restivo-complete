import React from 'react';

export function RestivoGlyph({ className = "w-6 h-6", color = "#B55234" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top Left Quadrant */}
      <path
        d="M6 6C17.0457 6 26 14.9543 26 26H6V6Z"
        fill={color}
      />
      {/* Bottom Left Quadrant */}
      <path
        d="M6 26C17.0457 26 26 34.9543 26 46H6V26Z"
        fill={color}
      />
      {/* Top Right Leaf */}
      <path
        d="M26 6C37.0457 6 46 14.9543 46 26C34.9543 26 26 17.0457 26 6Z"
        fill={color}
      />
      {/* Bottom Right Leaf */}
      <path
        d="M26 26C37.0457 26 46 34.9543 46 46C34.9543 46 26 37.0457 26 26Z"
        fill={color}
      />
    </svg>
  );
}
