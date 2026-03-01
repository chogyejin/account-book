import PageHeader from "../components/PageHeader";
import SavingsClient from "./SavingsClient";

export default function SavingsPage() {
  return (
    <>
      <PageHeader
        title="🏦 Savings Dashboard"
        subtitle="저축 내역을 기록하고 관리하세요"
      />
      <SavingsClient />
    </>
  );
}
