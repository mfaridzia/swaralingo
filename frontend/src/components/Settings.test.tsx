import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';

describe('Settings Component', () => {
  const mockUser = {
    id: 1,
    name: 'Farid Tester',
    email: 'farid@test.com',
    target_language: 'English',
  };

  it('should render user profile form with initial values', () => {
    render(<Settings user={mockUser} onProfileUpdated={vi.fn()} />);

    expect(screen.getByDisplayValue('Farid Tester')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profile Settings' })).toBeInTheDocument();
  });

  it('should show error when passwords do not match', () => {
    render(<Settings user={mockUser} onProfileUpdated={vi.fn()} />);

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'different123' } });

    const submitBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();
  });
});
