import PageHeader from "../components/PageHeader";
import InvestmentsClient from "./InvestmentsClient";

export default function InvestmentsPage() {
  return (
    <>
      <PageHeader
        title="📈 Investment Portfolio"
        subtitle="투자 자산을 관리하고 거래를 추적하세요"
      />
      <InvestmentsClient />
    </>
  );
}
