import { render, screen } from '@testing-library/react';

const mockMutate = jest.fn();

jest.mock('@/queries/use-register-mutation', () => ({
  useRegisterMutation: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import RegisterPage from './page';

describe('RegisterPage', () => {
  it('should render register form fields', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('Nome (opcional)')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeTruthy();
  });

  it('should render heading', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeTruthy();
  });

  it('should render link to login', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy();
  });
});
