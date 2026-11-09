import { PageHeader, Card } from "@/components/ui";
import { CustomerForm } from "@/components/forms/customer-form";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="Customer / Site baru" />
      <Card><CustomerForm /></Card>
    </>
  );
}
