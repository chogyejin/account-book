import PageHeader from "../components/PageHeader";
import IncomeClient from "./IncomeClient";

export default function IncomePage() {
  return (
    <>
      <PageHeader
        title="💰 Income Dashboard"
        subtitle="모든 수입을 기록하고 관리하세요"
      />
      <IncomeClient />
    </>
  );
}
