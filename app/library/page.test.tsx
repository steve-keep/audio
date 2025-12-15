import { render, screen } from '@testing-library/react';
import Library from './page';

describe('Library page', () => {
  it('should render the page and display the main navigation links', () => {
    render(<Library />);

    // Check for the new title with a lowercase "l"
    expect(screen.getByText('My library')).toBeInTheDocument();

    // Check that the main navigation links are present
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();

    // Ensure the settings link is still there
    expect(screen.getByTestId('settings-link')).toBeInTheDocument();
  });
});
