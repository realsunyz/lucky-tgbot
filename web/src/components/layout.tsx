import { Outlet } from "react-router-dom";
import { Header } from "@/components/header";

export default function Layout() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
