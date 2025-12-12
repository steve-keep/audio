import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileScanner from './FileScanner';

describe('FileScanner', () => {
  it('should open the file directory picker when the "Scan Music" button is clicked', () => {
    window.showDirectoryPicker = vi.fn();

    render(<FileScanner />);

    const scanButton = screen.getByRole('button', { name: /scan music/i });
    fireEvent.click(scanButton);

    expect(window.showDirectoryPicker).toHaveBeenCalledTimes(1);
  });
});
