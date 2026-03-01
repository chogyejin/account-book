import PageHeader from "../components/PageHeader";
import SpendingClient from "./SpendingClient";

export default function SpendingPage() {
  return (
    <>
      <PageHeader
        title="💸 Spending Dashboard"
        subtitle="내가 쓴 돈, 한눈에 보고 분석하기"
      />
      <SpendingClient />
    </>
  );
}
