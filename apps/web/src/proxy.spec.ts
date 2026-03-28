const mockRedirect = jest.fn();
const mockNext = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => { mockRedirect(...args); return { status: 307, headers: new Headers() }; },
    next: () => { mockNext(); return { status: 200 }; },
  },
}));

import { proxy } from './proxy';

function createRequest(pathname: string, hasToken: boolean) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      has: (name: string) => hasToken && name === 'access_token',
    },
  } as any;
}

describe('proxy middleware', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  it('should redirect logged-in user from /login to /dashboard', () => {
    proxy(createRequest('/login', true));
    expect(mockRedirect).toHaveBeenCalled();
    const url = mockRedirect.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/dashboard');
  });

  it('should redirect logged-in user from /register to /dashboard', () => {
    proxy(createRequest('/register', true));
    expect(mockRedirect).toHaveBeenCalled();
    const url = mockRedirect.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/dashboard');
  });

  it('should redirect unauthenticated user from /dashboard to /login', () => {
    proxy(createRequest('/dashboard', false));
    expect(mockRedirect).toHaveBeenCalled();
    const url = mockRedirect.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/login');
  });

  it('should redirect unauthenticated user from /dashboard/settings to /login', () => {
    proxy(createRequest('/dashboard/settings', false));
    expect(mockRedirect).toHaveBeenCalled();
  });

  it('should pass through for logged-in user on /dashboard', () => {
    proxy(createRequest('/dashboard', true));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should pass through for unauthenticated user on /login', () => {
    proxy(createRequest('/login', false));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should pass through for any user on unprotected route', () => {
    proxy(createRequest('/about', false));
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
