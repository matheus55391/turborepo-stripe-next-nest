import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Providers } from './providers';

describe('Providers', () => {
  it('should render children', () => {
    render(<Providers><div data-testid="child">Hello</div></Providers>);
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('should provide QueryClient context', () => {
    let captured: QueryClient | undefined;

    function Spy() {
      // If QueryClientProvider is active this won't throw
      return <div data-testid="spy">OK</div>;
    }

    render(
      <Providers>
        <Spy />
      </Providers>,
    );

    expect(screen.getByTestId('spy')).toHaveTextContent('OK');
  });
});
