export enum ApiRoute {
  // Auth
  AUTH_REGISTER = "/auth/register",
  AUTH_LOGIN = "/auth/login",
  AUTH_LOGOUT = "/auth/logout",
  AUTH_ME = "/auth/me",

  // Subscription
  SUBSCRIPTION = "/subscription",
  SUBSCRIPTION_PLANS = "/subscription/plans",
  SUBSCRIPTION_CHECKOUT = "/subscription/checkout",
  SUBSCRIPTION_PORTAL = "/subscription/portal",
  SUBSCRIPTION_CANCEL = "/subscription/cancel",

  // Pages
  PAGES = "/pages",

  // Webhooks
  WEBHOOKS_STRIPE = "/webhooks/stripe",
}

export enum QueryKey {
  PROFILE = "profile",
  PLANS = "plans",
  SUBSCRIPTION = "subscription",
  PAGES = "pages",
  PAGE = "page",
  LINKS = "links",
}

/** Build a page detail URL: /pages/:id */
export function pageRoute(pageId: string) {
  return `${ApiRoute.PAGES}/${pageId}`;
}

/** Build a public slug URL: /pages/slug/:slug */
export function pageSlugRoute(slug: string) {
  return `${ApiRoute.PAGES}/slug/${slug}`;
}

/** Build a links URL: /pages/:pageId/links */
export function linksRoute(pageId: string) {
  return `${ApiRoute.PAGES}/${pageId}/links`;
}

/** Build a single link URL: /pages/:pageId/links/:linkId */
export function linkRoute(pageId: string, linkId: string) {
  return `${ApiRoute.PAGES}/${pageId}/links/${linkId}`;
}

/** Build click tracking URL: /pages/:pageId/links/:linkId/click */
export function clickRoute(pageId: string, linkId: string) {
  return `${ApiRoute.PAGES}/${pageId}/links/${linkId}/click`;
}
