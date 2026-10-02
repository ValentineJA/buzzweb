import AppHeader from "@/app/components/app-header";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell auth-shell"><AppHeader />{children}</div>;
}