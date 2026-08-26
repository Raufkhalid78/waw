"use client";

import React from "react";

interface WhatsAppIconProps {
  className?: string;
  size?: number;
}

export function WhatsAppIcon({
  className = "w-6 h-6",
  size = 24,
}: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer WhatsApp Green Circular Bubble with Tail */}
      <path
        d="M24 4C12.954 4 4 12.954 4 24C4 27.879 5.105 31.503 7.02 34.58L4.35 44.35L14.34 41.73C17.295 43.43 20.529 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4Z"
        fill="#25D366"
      />

      {/* Crisp White WhatsApp Handset Receiver */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M34.8 28.5C34.2 28.2 31.3 26.8 30.8 26.6C30.3 26.4 29.9 26.3 29.5 26.9C29.1 27.5 28 28.8 27.7 29.1C27.4 29.4 27.1 29.5 26.5 29.2C25.9 28.9 24 28.3 21.8 26.3C20 24.7 18.8 22.8 18.5 22.2C18.2 21.6 18.4 21.3 18.7 21C19 20.7 19.3 20.3 19.6 20C19.9 19.7 20 19.4 20.2 19C20.4 18.6 20.3 18.2 20.2 17.9C20.1 17.6 19 14.8 18.5 13.7C18.05 12.63 17.58 12.78 17.22 12.77C16.89 12.76 16.51 12.76 16.14 12.76C15.76 12.76 15.15 12.9 14.62 13.48C14.09 14.06 12.6 15.45 12.6 18.28C12.6 21.11 14.66 23.85 14.95 24.23C15.24 24.61 19 30.41 24.76 32.89C26.13 33.48 27.2 33.83 28.03 34.09C29.41 34.53 30.66 34.47 31.65 34.32C32.76 34.16 35.04 32.94 35.52 31.6C36 30.26 36 29.11 35.86 28.87C35.72 28.63 35.34 28.5 34.8 28.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
