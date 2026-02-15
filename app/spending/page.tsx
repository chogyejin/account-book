import SpendingClient from "./SpendingClient";

export default function SpendingPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">💸 Spending Dashboard</h1>
        <p className="page-subtitle">내가 쓴 돈, 한눈에 보고 분석하기</p>
      </header>
      <SpendingClient />
    </>
  );
}
