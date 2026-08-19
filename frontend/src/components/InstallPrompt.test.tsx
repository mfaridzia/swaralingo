import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt Component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('should reveal install prompt when beforeinstallprompt event fires and handle install', async () => {
    render(<InstallPrompt />);

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const fakeEvent = new Event('beforeinstallprompt') as any;
    fakeEvent.prompt = mockPrompt;
    fakeEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    expect(screen.getByText('Install SwaraLingo')).toBeInTheDocument();

    const installBtn = screen.getByRole('button', { name: 'Install' });
    fireEvent.click(installBtn);

    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it('should dismiss install prompt and store flag in sessionStorage', () => {
    render(<InstallPrompt />);

    const fakeEvent = new Event('beforeinstallprompt') as any;
    fakeEvent.prompt = vi.fn();
    fakeEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    const dismissBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Install SwaraLingo')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('swaralingo_install_dismissed')).toBe('1');
  });
});
