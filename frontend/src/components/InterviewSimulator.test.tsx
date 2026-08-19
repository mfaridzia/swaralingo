import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewSimulator } from './InterviewSimulator';

describe('InterviewSimulator Component', () => {
  it('should render role selection and launch simulation session', () => {
    render(<InterviewSimulator />);

    expect(screen.getByText(/AI Interview Simulator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch simulation session/i })).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /launch simulation session/i });
    fireEvent.click(startBtn);

    // After start, recruiter welcome appears
    expect(screen.getAllByText(/Evelyn/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Type or speak your professional answer here.../i)).toBeInTheDocument();
  });

  it('should allow candidate to submit answer and receive feedback', () => {
    render(<InterviewSimulator />);

    const startBtn = screen.getByRole('button', { name: /launch simulation session/i });
    fireEvent.click(startBtn);

    const answerInput = screen.getByPlaceholderText(/Type or speak your professional answer here.../i);
    fireEvent.change(answerInput, {
      target: {
        value: 'Client-side rendering executes in the browser, while SSR executes on the server.',
      },
    });

    const buttons = screen.getAllByRole('button');
    const actualSendBtn = buttons[buttons.length - 1];
    fireEvent.click(actualSendBtn);

    expect(screen.getByText(/Client-side rendering executes in the browser/i)).toBeInTheDocument();
  });
});
