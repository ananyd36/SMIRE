import AuthWrapper from "@/components/AuthWrapper";
import Navbar from "@/components/layout/Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </AuthWrapper>
  );
}
