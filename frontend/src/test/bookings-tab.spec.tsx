import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyBookingsPage } from '../pages/bookings/MyBookingsPage';
import { BookingModalProvider } from '../context/BookingModalContext';

describe('MyBookingsPage Tab Switching & Empty States (Vitest + RTL)', () => {
  it('renders tab buttons and allows switching between upcoming, past, and cancelled', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BookingModalProvider>
            <MyBookingsPage />
          </BookingModalProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const upcomingTab = screen.getByText('Upcoming Meetings');
    const pastTab = screen.getByText('Past (Completed)');
    const cancelledTab = screen.getByText('Cancelled');

    expect(upcomingTab).toBeInTheDocument();
    expect(pastTab).toBeInTheDocument();
    expect(cancelledTab).toBeInTheDocument();

    // Click Past
    fireEvent.click(pastTab);
    expect(pastTab).toHaveClass('border-primary');

    // Click Cancelled
    fireEvent.click(cancelledTab);
    expect(cancelledTab).toHaveClass('border-primary');
  });
});
