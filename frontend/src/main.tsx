import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { BookingModalProvider } from './context/BookingModalContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BookingModalProvider>
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: '#151B2A',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#F8FAFC',
                },
              }}
            />
            <App />
          </BookingModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
