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
}
