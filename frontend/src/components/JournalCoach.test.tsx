import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JournalCoach } from './JournalCoach';

describe('JournalCoach Component', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should render journal prompt and update word count as user types', () => {
    render(<JournalCoach />, { wrapper: createWrapper() });

    expect(screen.getByText('AI Journaling & Reflection')).toBeInTheDocument();
    expect(screen.getByText(/AI Prompted/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Reflect on your day here.../i);
    fireEvent.change(textarea, {
      target: { value: 'Today I refactored the entire frontend component test suite.' },
    });

    expect(screen.getByText(/9 words/i)).toBeInTheDocument();
  });
});
