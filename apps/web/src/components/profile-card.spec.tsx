import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Plan } from '@repo/shared/types';

const mockMutate = jest.fn();

jest.mock('@/queries/use-profile-query', () => ({
  useProfileQuery: () => ({
    data: { id: '1', email: 'a@b.com', name: 'Alice', plan: Plan.STARTER },
  }),
}));

jest.mock('@/queries/use-plans-query', () => ({
  usePlansQuery: () => ({
    data: [
      { key: Plan.FREE, name: 'Grátis' },
      { key: Plan.STARTER, name: 'Starter' },
    ],
  }),
}));

jest.mock('@/queries/use-logout-mutation', () => ({
  useLogoutMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import { ProfileCard } from './profile-card';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ProfileCard', () => {
  beforeEach(() => mockMutate.mockClear());

  it('should render user name and email', () => {
    render(<ProfileCard />, { wrapper });
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('a@b.com')).toBeTruthy();
  });

  it('should show plan name from plans list', () => {
    render(<ProfileCard />, { wrapper });
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  it('should show initial from name', () => {
    render(<ProfileCard />, { wrapper });
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('should call logout on button click', () => {
    render(<ProfileCard />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(mockMutate).toHaveBeenCalled();
  });
});
