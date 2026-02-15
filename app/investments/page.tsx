import InvestmentsClient from "./InvestmentsClient";

export default function InvestmentsPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">📈 Investment Portfolio</h1>
        <p className="page-subtitle">투자 자산을 관리하고 거래를 추적하세요</p>
      </header>
      <InvestmentsClient />
    </>
  );
}
