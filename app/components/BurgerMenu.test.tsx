// app/components/BurgerMenu.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import BurgerMenu from './BurgerMenu';

describe('BurgerMenu', () => {
  it('should render the burger menu button', () => {
    render(<BurgerMenu />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should not show the settings link by default', () => {
    render(<BurgerMenu />);
    const settingsLink = screen.queryByText('Settings');
    expect(settingsLink).not.toBeInTheDocument();
  });

  it('should show the settings link when the button is clicked', () => {
    render(<BurgerMenu />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const settingsLink = screen.getByText('Settings');
    expect(settingsLink).toBeInTheDocument();
  });
});
