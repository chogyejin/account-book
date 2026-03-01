import PageHeader from "../components/PageHeader";
import SummaryClient from "./SummaryClient";

export default function SummaryPage() {
  return (
    <>
      <PageHeader
        title="📊 Summary"
        subtitle="월별·연도별 재무 현황을 한눈에"
      />
      <SummaryClient />
    </>
  );
}
