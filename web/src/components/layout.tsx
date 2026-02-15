import { Outlet } from "react-router-dom";
import { Header } from "@/components/header";

export default function Layout() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <Outlet />
        <footer className="py-6 text-center text-xs text-muted-foreground">
          <p>由 Lucky Bot 提供服务 · 用户协议适用</p>
        </footer>
      </main>
    </div>
  );
}
