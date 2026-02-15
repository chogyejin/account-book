import QuickEntryClient from "./QuickEntryClient";

export default function QuickEntryPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">💰 Quick Entry</h1>
        <p className="page-subtitle">
          스티커처럼 간편하게, 편지처럼 정성스럽게
        </p>
      </header>
      <QuickEntryClient />
    </>
  );
}
