import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCheckoutMutate = jest.fn();
const mockPortalMutate = jest.fn();
const mockCancelMutate = jest.fn();

jest.mock('@/queries/use-profile-query', () => ({
  useProfileQuery: () => ({
    data: { id: '1', email: 'a@b.com', name: 'Alice', plan: 'STARTER' },
  }),
}));

jest.mock('@/queries/use-plans-query', () => ({
  usePlansQuery: () => ({
    data: [
      { key: 'FREE', name: 'Grátis', price: 0, features: ['1 página'], limits: { maxPages: 1, maxLinksPerPage: 3 } },
      { key: 'STARTER', name: 'Starter', price: 9.9, priceId: 'price_123', features: ['5 páginas'], limits: { maxPages: 5, maxLinksPerPage: 10 } },
    ],
    isLoading: false,
  }),
}));

jest.mock('@/queries/use-subscription-query', () => ({
  useSubscriptionQuery: () => ({
    data: {
      plan: 'STARTER',
      subscription: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: '2026-04-24T00:00:00.000Z',
      },
    },
  }),
}));

jest.mock('@/queries/use-checkout-mutation', () => ({
  useCheckoutMutation: () => ({
    mutate: mockCheckoutMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('@/queries/use-portal-mutation', () => ({
  usePortalMutation: () => ({
    mutate: mockPortalMutate,
    isPending: false,
  }),
}));

jest.mock('@/queries/use-cancel-mutation', () => ({
  useCancelMutation: () => ({
    mutate: mockCancelMutate,
    isPending: false,
  }),
}));

import { BillingCard } from './billing-card';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('BillingCard', () => {
  beforeEach(() => {
    mockCheckoutMutate.mockClear();
    mockPortalMutate.mockClear();
    mockCancelMutate.mockClear();
  });

  it('should render plan cards', () => {
    render(<BillingCard />, { wrapper });
    expect(screen.getAllByText('Grátis').length).toBeGreaterThan(0);
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  it('should show current badge on active plan', () => {
    render(<BillingCard />, { wrapper });
    expect(screen.getByText('Atual')).toBeTruthy();
  });

  it('should show subscription renewal date', () => {
    render(<BillingCard />, { wrapper });
    expect(screen.getByText(/renova em/)).toBeTruthy();
  });

  it('should render manage subscription button', () => {
    render(<BillingCard />, { wrapper });
    const btn = screen.getByRole('button', { name: 'Gerenciar assinatura' });
    expect(btn).toBeTruthy();
  });

  it('should call portal mutation on manage click', () => {
    render(<BillingCard />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar assinatura' }));
    expect(mockPortalMutate).toHaveBeenCalled();
  });

  it('should show cancel confirm on cancel click', () => {
    render(<BillingCard />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    expect(screen.getByText('Tem certeza?')).toBeTruthy();
  });

  it('should call cancel mutation with false on "Sim, cancelar"', () => {
    render(<BillingCard />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, cancelar' }));
    expect(mockCancelMutate).toHaveBeenCalledWith(false);
  });

  it('should show plan features', () => {
    render(<BillingCard />, { wrapper });
    expect(screen.getByText('✓ 1 página')).toBeTruthy();
    expect(screen.getByText('✓ 5 páginas')).toBeTruthy();
  });
});
