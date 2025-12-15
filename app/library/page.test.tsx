import { render, screen } from '@testing-library/react';
import Library from './page';

describe('Library page', () => {
  it('should render the page', () => {
    render(<Library />);
    expect(screen.getByText('My library')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();
  });
});
