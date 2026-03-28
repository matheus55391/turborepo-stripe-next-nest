import { api } from "@/lib/api";
import { Plan, SubscriptionStatus } from "@repo/shared/types";
import {
  fetchPlans,
  fetchSubscription,
  createCheckout,
  createPortalSession,
  cancelSubscription,
} from "./subscription";

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockPlans = [
  {
    key: Plan.FREE,
    name: "Grátis",
    price: 0,
    limits: { maxPages: 1, maxLinksPerPage: 3 },
    features: ["1 página", "3 links por página"],
  },
  {
    key: Plan.STARTER,
    name: "Starter",
    price: 9.9,
    priceId: "price_123",
    limits: { maxPages: 5, maxLinksPerPage: 10 },
    features: ["5 páginas", "10 links por página"],
  },
];

const mockSub = {
  plan: Plan.STARTER,
  subscription: {
    id: "sub_1",
    stripeSubscriptionId: "sub_stripe_1",
    stripePriceId: "price_123",
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: "2026-04-24T00:00:00.000Z",
    cancelAtPeriodEnd: false,
  },
};

describe("fetchPlans", () => {
  it("should return plans on success", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { plans: mockPlans } });

    const plans = await fetchPlans();

    expect(plans).toEqual(mockPlans);
    expect(plans).toHaveLength(2);
    expect(plans[0]!.key).toBe(Plan.FREE);
  });

  it("should call api.get with SUBSCRIPTION_PLANS route", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { plans: mockPlans } });

    await fetchPlans();

    expect(api.get).toHaveBeenCalledWith("/subscription/plans");
  });

  it("should throw on error", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Erro ao buscar planos"));

    await expect(fetchPlans()).rejects.toThrow("Erro ao buscar planos");
  });

  it("FREE plan should not have priceId", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { plans: mockPlans } });

    const plans = await fetchPlans();
    expect(plans[0]!.priceId).toBeUndefined();
  });

  it("STARTER plan should have priceId", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { plans: mockPlans } });

    const plans = await fetchPlans();
    expect(plans[1]!.priceId).toBeDefined();
  });
});

describe("fetchSubscription", () => {
  it("should return subscription info on success", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockSub });

    const result = await fetchSubscription();
    expect(result).toEqual(mockSub);
  });

  it("should call api.get with SUBSCRIPTION route", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockSub });

    await fetchSubscription();

    expect(api.get).toHaveBeenCalledWith("/subscription");
  });

  it("should throw on error", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Erro ao buscar assinatura"));

    await expect(fetchSubscription()).rejects.toThrow("Erro ao buscar assinatura");
  });
});

describe("createCheckout", () => {
  it("should return checkout url on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { url: "https://checkout.stripe.com/session" },
    });

    const url = await createCheckout({ priceId: "price_123" });
    expect(url).toBe("https://checkout.stripe.com/session");
  });

  it("should send priceId, successUrl and cancelUrl in body", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { url: "https://checkout.stripe.com/session" },
    });

    await createCheckout({ priceId: "price_123" });

    expect(api.post).toHaveBeenCalledWith(
      "/subscription/checkout",
      expect.objectContaining({
        priceId: "price_123",
        successUrl: expect.stringContaining("checkout=success"),
        cancelUrl: expect.stringContaining("checkout=cancel"),
      }),
    );
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Erro ao criar sessão de checkout"));

    await expect(createCheckout({ priceId: "price_123" })).rejects.toThrow(
      "Erro ao criar sessão de checkout",
    );
  });
});

describe("createPortalSession", () => {
  it("should return portal url on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { url: "https://billing.stripe.com/session" },
    });

    const url = await createPortalSession();
    expect(url).toBe("https://billing.stripe.com/session");
  });

  it("should send returnUrl in body", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { url: "https://billing.stripe.com/session" },
    });

    await createPortalSession();

    expect(api.post).toHaveBeenCalledWith(
      "/subscription/portal",
      expect.objectContaining({
        returnUrl: expect.stringContaining("/dashboard"),
      }),
    );
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(
      new Error("Erro ao abrir portal de cobrança"),
    );

    await expect(createPortalSession()).rejects.toThrow(
      "Erro ao abrir portal de cobrança",
    );
  });
});

describe("cancelSubscription", () => {
  it("should resolve on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await expect(cancelSubscription()).resolves.toBeUndefined();
  });

  it("should send immediate=false by default", async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await cancelSubscription();

    expect(api.post).toHaveBeenCalledWith("/subscription/cancel", { immediate: false });
  });

  it("should send immediate=true when specified", async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await cancelSubscription(true);

    expect(api.post).toHaveBeenCalledWith("/subscription/cancel", { immediate: true });
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Erro ao cancelar assinatura"));

    await expect(cancelSubscription()).rejects.toThrow("Erro ao cancelar assinatura");
  });
});
