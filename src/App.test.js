import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

test('renders Email Metrics Dashboard', () => {
  render(<Dashboard />);
  const dashboardHeader = screen.getByText(/Email Metrics Dashboard/i);
  expect(dashboardHeader).toBeInTheDocument();
});
