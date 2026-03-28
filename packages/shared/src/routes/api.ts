// ── Auth ──

export enum AuthRoute {
  REGISTER = '/auth/register',
  LOGIN = '/auth/login',
  LOGOUT = '/auth/logout',
  ME = '/auth/me',
}

// ── Subscription ──

export enum SubscriptionRoute {
  BASE = '/subscription',
  PLANS = '/subscription/plans',
  CHECKOUT = '/subscription/checkout',
  PORTAL = '/subscription/portal',
  CANCEL = '/subscription/cancel',
}

// ── Pages & Links ──

export enum PageRoute {
  BASE = '/pages',
}

export function pageRoute(pageId: string) {
  return `${PageRoute.BASE}/${pageId}`;
}

export function pageSlugRoute(slug: string) {
  return `${PageRoute.BASE}/slug/${slug}`;
}

export function linksRoute(pageId: string) {
  return `${PageRoute.BASE}/${pageId}/links`;
}

export function linkRoute(pageId: string, linkId: string) {
  return `${PageRoute.BASE}/${pageId}/links/${linkId}`;
}

export function clickRoute(pageId: string, linkId: string) {
  return `${PageRoute.BASE}/${pageId}/links/${linkId}/click`;
}

// ── Webhooks ──

export enum WebhookRoute {
  STRIPE = '/webhooks/stripe',
}
