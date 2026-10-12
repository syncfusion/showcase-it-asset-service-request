import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the app shell sidebar brand', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );
  // The sidebar brand block is part of the shell.
  expect(screen.getByText(/IT Asset Portal/i)).toBeInTheDocument();
});
