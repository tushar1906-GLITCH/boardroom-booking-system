import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingModal } from '../components/bookings/BookingModal';
import { BookingModalProvider, useBookingModal } from '../context/BookingModalContext';

// Helper component to trigger modal opening
const TestTrigger: React.FC = () => {
  const { openBookingModal } = useBookingModal();
  return (
    <div>
      <button onClick={() => openBookingModal()}>Open Modal</button>
      <BookingModal />
    </div>
  );
};

describe('BookingModal Validation & Conflict Rendering (Vitest + RTL)', () => {
  it('opens and displays required form controls', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BookingModalProvider>
          <TestTrigger />
        </BookingModalProvider>
      </QueryClientProvider>,
    );

    // Click open
    fireEvent.click(screen.getByText('Open Modal'));

    // Modal should be visible
    expect(screen.getByText('Schedule Meeting Room')).toBeInTheDocument();
    expect(screen.getByText('Meeting Title')).toBeInTheDocument();
    expect(screen.getByText('Confirm Reservation')).toBeInTheDocument();
  });
});
