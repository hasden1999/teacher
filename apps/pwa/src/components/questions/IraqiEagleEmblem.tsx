import React from 'react';

export interface IraqiEagleEmblemProps {
  className?: string;
  size?: number;
}

/**
 * Iraqi Republican Eagle Emblem (نسر جمهورية العراق المعتمد في وزارة التربية)
 * High-precision vector emblem with the Eagle of Saladin, the national flag shield, and the Kufic Takbir.
 */
export const IraqiEagleEmblem: React.FC<IraqiEagleEmblemProps> = ({
  className = '',
  size = 56,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      aria-label="شعار جمهورية العراق - وزارة التربية"
      role="img"
    >
      {/* Eagle Body & Head Silhouette */}
      <g fill="#1A202C">
        {/* Head and Crown */}
        <path d="M60 14 C56 14 53 17 53 21 C53 24 55 26 57 27 L53 32 L60 30 L67 32 L63 27 C65 26 67 24 67 21 C67 17 64 14 60 14 Z" />
        {/* Beak pointing left (heraldic right) */}
        <path d="M54 20 L48 23 L54 25 Z" />
        {/* Neck */}
        <path d="M55 28 L53 38 L67 38 L65 28 Z" />
        {/* Left Wing (Feathers spreading outward) */}
        <path d="M52 36 C42 34 28 40 18 52 C14 57 12 64 10 72 C14 68 20 66 26 66 C22 72 19 80 18 88 C24 82 30 80 37 80 C33 87 31 94 30 102 C36 96 42 93 49 93 C47 97 46 102 46 106 L53 106 C52 98 52 82 52 68 Z" />
        {/* Right Wing (Feathers spreading outward) */}
        <path d="M68 36 C78 34 92 40 102 52 C106 57 108 64 110 72 C106 68 100 66 94 66 C98 72 101 80 102 88 C96 82 90 80 83 80 C87 87 89 94 90 102 C84 96 78 93 71 93 C73 97 74 102 74 106 L67 106 C68 98 68 82 68 68 Z" />
        {/* Tail Feathers */}
        <path d="M50 106 L46 116 L54 114 L60 117 L66 114 L74 116 L70 106 Z" />
        {/* Talons grasping the scroll */}
        <path d="M48 104 C46 107 48 110 52 110 C54 110 56 108 55 104 Z" />
        <path d="M72 104 C74 107 72 110 68 110 C66 110 64 108 65 104 Z" />
      </g>

      {/* Iraqi Shield on Eagle's Breast */}
      <g>
        {/* Shield Frame Border */}
        <path
          d="M44 42 L76 42 C76 42 77 68 76 78 C75 87 60 97 60 97 C60 97 45 87 44 78 C43 68 44 42 44 42 Z"
          fill="#FFFFFF"
          stroke="#1A202C"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Shield Tri-color Bands (Horizontal Iraqi Flag) */}
        {/* Top Band: Red */}
        <path
          d="M45.5 43.5 L74.5 43.5 L74.8 56 C70 56 50 56 45.2 56 Z"
          fill="#CE1126"
        />

        {/* Middle Band: White with Kufic 'Allahu Akbar' */}
        <path
          d="M45.2 56 L74.8 56 L75 69 L45 69 Z"
          fill="#FFFFFF"
        />
        {/* Takbir Text in green */}
        <text
          x="60"
          y="65.5"
          textAnchor="middle"
          fontSize="6.8"
          fontWeight="900"
          fontFamily="sans-serif"
          fill="#007A3D"
          letterSpacing="0.5"
        >
          الله ★ أكبر
        </text>

        {/* Bottom Band: Black */}
        <path
          d="M45 69 L75 69 C74.5 76 60 94.5 60 94.5 C60 94.5 45.5 76 45 69 Z"
          fill="#000000"
        />
      </g>

      {/* Scroll banner underneath talons with 'جمهورية العراق' */}
      <g>
        <path
          d="M32 107 C45 104 75 104 88 107 L85 113 C73 111 47 111 35 113 Z"
          fill="#FFFFFF"
          stroke="#1A202C"
          strokeWidth="1.2"
        />
        <text
          x="60"
          y="111.5"
          textAnchor="middle"
          fontSize="4.5"
          fontWeight="bold"
          fontFamily="sans-serif"
          fill="#1A202C"
        >
          جمهورية العراق
        </text>
      </g>
    </svg>
  );
};
