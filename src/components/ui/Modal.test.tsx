import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('renders via Portal into document.body with dialog accessibility and Safari-safe frosted backdrop', () => {
    const onClose = vi.fn();
    const { container, rerender, unmount } = render(
      <div data-testid="app-root">
        <Modal isOpen={true} onClose={onClose} title="Order Details">
          <p>Modal content</p>
        </Modal>
      </div>
    );

    const appRoot = screen.getByTestId('app-root');
    const dialog = screen.getByRole('dialog');
    const backdrop = screen.getByTestId('modal-backdrop');

    // Rendered inside document.body outside app-root via React Portal
    expect(container.contains(dialog)).toBe(false);
    expect(appRoot.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);

    // Accessibility attributes
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledById = dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const heading = document.getElementById(labelledById!);
    expect(heading?.textContent).toBe('Order Details');

    // Full-screen frosted backdrop without transform-gpu (prevents Safari blur clipping)
    expect(backdrop.className).toContain('fixed');
    expect(backdrop.className).toContain('inset-0');
    expect(backdrop.className).toContain('backdrop-blur-md');
    expect(backdrop.className).not.toContain('transform-gpu');

    // Locks body scroll while open
    expect(document.body.style.overflow).toBe('hidden');

    // Restores body scroll when closed
    rerender(
      <div data-testid="app-root">
        <Modal isOpen={false} onClose={onClose} title="Order Details">
          <p>Modal content</p>
        </Modal>
      </div>
    );
    expect(document.body.style.overflow).toBe('');

    // Re-open then unmount restores body scroll too
    rerender(
      <div data-testid="app-root">
        <Modal isOpen={true} onClose={onClose} title="Order Details">
          <p>Modal content</p>
        </Modal>
      </div>
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('calls onClose on backdrop or close button click, but not when clicking inside the dialog', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Cart">
        <button type="button">Inside Button</button>
      </Modal>
    );

    // Clicking inside dialog content should NOT close
    fireEvent.click(screen.getByText('Inside Button'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    // Clicking backdrop closes once
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clicking close button closes once
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('prevents closing via backdrop click, close button, and Escape when disableClose is true', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Saving..." disableClose={true}>
        <p>Please wait</p>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Close modal' }) as HTMLButtonElement;
    expect(closeButton.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    fireEvent.click(closeButton);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies fullscreen layout classes when fullscreen is true', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} fullscreen={true} ariaLabel="Fullscreen Preview">
        <img alt="Preview" src="/preview.png" />
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    const dialog = screen.getByRole('dialog');

    expect(overlay.className).toContain('p-0');
    expect(dialog.getAttribute('data-fullscreen')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Fullscreen Preview');
    expect(dialog.className).toContain('w-full');
    expect(dialog.className).toContain('h-full');
    expect(dialog.className).toContain('rounded-none');
  });

  it('handles stacked modals in LIFO order for Escape key and body overflow lock', async () => {
    const onClose1Spy = vi.fn();
    const onClose2Spy = vi.fn();

    function StackedHarness() {
      const [open1, setOpen1] = useState(true);
      const [open2, setOpen2] = useState(true);

      return (
        <>
          <Modal
            isOpen={open1}
            onClose={() => {
              onClose1Spy();
              setOpen1(false);
            }}
            title="Parent Modal"
          >
            <p>Parent content</p>
          </Modal>
          <Modal
            isOpen={open2}
            onClose={() => {
              onClose2Spy();
              setOpen2(false);
            }}
            title="Child Modal"
          >
            <p>Child content</p>
          </Modal>
        </>
      );
    }

    render(<StackedHarness />);

    const overlays = screen.getAllByTestId('modal-overlay');
    expect(overlays).toHaveLength(2);

    const z1 = Number(overlays[0].style.zIndex);
    const z2 = Number(overlays[1].style.zIndex);
    expect(z1).toBeGreaterThanOrEqual(80);
    expect(z2).toBeGreaterThan(z1);
    expect(document.body.style.overflow).toBe('hidden');

    // First Escape closes only the top modal (Child Modal)
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose2Spy).toHaveBeenCalledTimes(1);
    expect(onClose1Spy).not.toHaveBeenCalled();

    // Parent modal is still open, so body scroll remains locked
    await waitFor(() => {
      expect(screen.queryByText('Child Modal')).toBeNull();
    });
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByText('Parent Modal')).toBeTruthy();

    // Second Escape closes the remaining parent modal and unlocks body scroll
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose1Spy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Parent Modal')).toBeNull();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('does not fall through Escape to lower modal when topmost stacked modal has disableClose', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    render(
      <>
        <Modal isOpen={true} onClose={onClose1} title="Lower Modal" disableClose={false}>
          <p>Lower</p>
        </Modal>
        <Modal isOpen={true} onClose={onClose2} title="Locked Top Modal" disableClose={true}>
          <p>Locked</p>
        </Modal>
      </>
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose2).not.toHaveBeenCalled();
    expect(onClose1).not.toHaveBeenCalled();
  });
});
