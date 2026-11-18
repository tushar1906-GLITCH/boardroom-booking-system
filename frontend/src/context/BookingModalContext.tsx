import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BookingModalInitialData {
  roomId?: string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // ISO or HH:mm
  endTime?: string; // ISO or HH:mm
}

interface BookingModalContextType {
  isOpen: boolean;
  initialData: BookingModalInitialData | null;
  openBookingModal: (data?: BookingModalInitialData) => void;
  closeBookingModal: () => void;
}

const BookingModalContext = createContext<BookingModalContextType | undefined>(undefined);

export const BookingModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<BookingModalInitialData | null>(null);

  const openBookingModal = (data?: BookingModalInitialData) => {
    setInitialData(data || null);
    setIsOpen(true);
  };

  const closeBookingModal = () => {
    setIsOpen(false);
    setInitialData(null);
  };

  return (
    <BookingModalContext.Provider
      value={{
        isOpen,
        initialData,
        openBookingModal,
        closeBookingModal,
      }}
    >
      {children}
    </BookingModalContext.Provider>
  );
};

export const useBookingModal = () => {
  const context = useContext(BookingModalContext);
  if (!context) {
    throw new Error('useBookingModal must be used within a BookingModalProvider');
  }
  return context;
};
