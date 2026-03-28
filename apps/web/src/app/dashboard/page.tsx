import { ProfileCardDynamic } from "@/components/profile-card-dynamic";
import { BillingCardDynamic } from "@/components/billing-card-dynamic";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileCardDynamic />
      <BillingCardDynamic />
    </div>
  );
}
