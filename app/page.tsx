import PageHeader from "./components/PageHeader";
import QuickEntryClient from "./QuickEntryClient";

export default function QuickEntryPage() {
  return (
    <>
      <PageHeader
        title="💰 Quick Entry"
        subtitle="스티커처럼 간편하게, 편지처럼 정성스럽게"
      />
      <QuickEntryClient />
    </>
  );
}
