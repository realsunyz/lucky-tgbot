import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import CreateLotteryPage from "@/pages/CreateLotteryPage";
import LotteryPage from "@/pages/LotteryPage";
import EditLotteryPage from "@/pages/EditLotteryPage";

import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/create/:id" element={<CreateLotteryPage />} />
            <Route path="/lottery/:id" element={<LotteryPage />} />
            <Route path="/edit/:id" element={<EditLotteryPage />} />
            <Route
              path="/"
              element={
                <div className="flex flex-1 items-center justify-center p-4">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">🎉 Lucky Bot</h1>
                    <p className="text-muted-foreground">
                      通过 Telegram Bot 创建和管理抽奖
                    </p>
                  </div>
                </div>
              }
            />
          </Route>
        </Routes>
        <Toaster richColors position="top-center" />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
