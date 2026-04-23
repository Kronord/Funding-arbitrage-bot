import AuthGuard from '@/components/auth/AuthGuard';
import Sidebar   from '@/components/ui/Sidebar';
import Header    from '@/components/ui/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-56">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}