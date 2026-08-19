import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalPage } from './LegalPage';

describe('LegalPage Component', () => {
  it('should render Privacy Policy correctly and handle back button', () => {
    const onBack = vi.fn();
    render(<LegalPage type="privacy" onBack={onBack} />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();

    const backButtons = screen.getAllByRole('button');
    fireEvent.click(backButtons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should render Terms of Service correctly', () => {
    render(<LegalPage type="terms" onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
  });
});
