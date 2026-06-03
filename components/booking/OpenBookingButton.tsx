'use client';

import React, { useState } from 'react';
import { BookingModal } from './BookingModal';

interface OpenBookingButtonProps {
  professionalSlug: string;
  children: React.ReactNode;
  className?: string;
}

export const OpenBookingButton: React.FC<OpenBookingButtonProps> = ({
  professionalSlug,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={className}
      >
        {children}
      </button>

      <BookingModal 
        professionalSlug={professionalSlug} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default OpenBookingButton;
