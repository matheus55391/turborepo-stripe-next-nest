import { render, screen } from '@testing-library/react';

const mockMutate = jest.fn();

jest.mock('@/queries/use-login-mutation', () => ({
  useLoginMutation: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import LoginPage from './page';

describe('LoginPage', () => {
  it('should render login form fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('should render heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeTruthy();
  });

  it('should render link to register', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Cadastre-se' })).toBeTruthy();
  });
});
