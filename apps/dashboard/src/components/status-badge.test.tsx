import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderStatusBadge, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the given label', () => {
    render(<StatusBadge label="Actif" tone="good" />);
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('applies the tone-specific text color class, never relying on color alone', () => {
    render(<StatusBadge label="Bloqué" tone="critical" />);
    // Status must always carry a label (asserted above) — the tone class is
    // just the color reinforcement, per this design system's contrast rule.
    expect(screen.getByText('Bloqué').closest('span')).toHaveClass('text-status-critical');
  });

  it('falls back to the neutral tone when none is given', () => {
    render(<StatusBadge label="Inconnu" />);
    expect(screen.getByText('Inconnu').closest('span')).toHaveClass('text-muted-foreground');
  });
});

describe('OrderStatusBadge', () => {
  it('translates a known order status to its French label', () => {
    render(<OrderStatusBadge status="DELIVERED" />);
    expect(screen.getByText('Livrée')).toBeInTheDocument();
  });

  it('falls back to the raw status string for an unrecognized value', () => {
    render(<OrderStatusBadge status="SOME_FUTURE_STATUS" />);
    expect(screen.getByText('SOME_FUTURE_STATUS')).toBeInTheDocument();
  });
});
