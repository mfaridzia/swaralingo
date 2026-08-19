import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetNeedRefresh = vi.fn();
const mockUpdateServiceWorker = vi.fn();
let mockNeedRefreshState = true;

vi.mock('virtual:pwa-register/react', () => {
  return {
    useRegisterSW: () => ({
      needRefresh: [mockNeedRefreshState, mockSetNeedRefresh],
      updateServiceWorker: mockUpdateServiceWorker,
    }),
  };
});

import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner Component', () => {
  it('should render banner when update is available and trigger refresh on click', () => {
    mockNeedRefreshState = true;
    render(<UpdateBanner />);

    expect(screen.getByText(/A new version is available/i)).toBeInTheDocument();
    const updateBtn = screen.getByRole('button', { name: /update/i });
    expect(updateBtn).toBeInTheDocument();

    fireEvent.click(updateBtn);
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);

    const dismissBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(dismissBtn);
    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });
});
