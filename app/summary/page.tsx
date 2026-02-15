import SummaryClient from "./SummaryClient";

export default function SummaryPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">📊 Summary</h1>
        <p className="page-subtitle">월별·연도별 재무 현황을 한눈에</p>
      </header>
      <SummaryClient />
    </>
  );
}
