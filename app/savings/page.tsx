import SavingsClient from "./SavingsClient";

export default function SavingsPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">🏦 Savings Dashboard</h1>
        <p className="page-subtitle">저축 내역을 기록하고 관리하세요</p>
      </header>
      <SavingsClient />
    </>
  );
}
