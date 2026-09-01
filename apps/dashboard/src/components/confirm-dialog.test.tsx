import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

/** Exercises the whole trigger -> dialog -> confirm/cancel flow through
 *  real Radix AlertDialog behavior (portal, focus, open state) rather than
 *  mocking it — this is what replaced the native window.confirm(...). */
describe('ConfirmDialog', () => {
  it('is closed until the trigger is clicked, then shows the title and description', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        trigger={<button>Supprimer</button>}
        title="Supprimer cet utilisateur ?"
        description="Cette action est irréversible."
        onConfirm={() => {}}
      />,
    );

    expect(screen.queryByText('Supprimer cet utilisateur ?')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Supprimer cet utilisateur ?')).toBeInTheDocument();
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument();
  });

  it('calls onConfirm and closes when the confirm action is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<button>Supprimer</button>}
        title="Supprimer ?"
        description="..."
        confirmLabel="Supprimer"
        destructive
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    // Two "Supprimer" buttons exist once open: the trigger and the action —
    // the action is the one inside the dialog.
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not call onConfirm when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog trigger={<button>Ouvrir</button>} title="Titre" description="Description" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
