import IncomeClient from "./IncomeClient";

export default function IncomePage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">💰 Income Dashboard</h1>
        <p className="page-subtitle">모든 수입을 기록하고 관리하세요</p>
      </header>
      <IncomeClient />
    </>
  );
}
