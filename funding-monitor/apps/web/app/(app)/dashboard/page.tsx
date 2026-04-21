import FundingTable from '@/components/funding/FundingTable';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#cdd9e5]">Dashboard</h2>
        <p className="text-sm text-text-muted mt-1">
          Топ монет з плюсовим фандингом — оновлюється кожні 2 хв
        </p>
      </div>
      <FundingTable />
    </div>
  );
}