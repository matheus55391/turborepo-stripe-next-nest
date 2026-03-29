import { render, screen } from '@testing-library/react';

jest.mock('@/components/profile-card-dynamic', () => ({
  ProfileCardDynamic: () => <div data-testid="profile-card">Profile</div>,
}));

jest.mock('@/components/billing-card-dynamic', () => ({
  BillingCardDynamic: () => <div data-testid="billing-card">Billing</div>,
}));

import DashboardPage from './page';

describe('DashboardPage', () => {
  it('should render profile and billing cards', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('profile-card')).toBeTruthy();
    expect(screen.getByTestId('billing-card')).toBeTruthy();
  });
});
