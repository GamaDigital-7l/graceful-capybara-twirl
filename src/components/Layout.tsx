import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import ProtectedRoute from "./ProtectedRoute";

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string; // Optional prop to pass a specific title to the Header
}

export function Layout({ children, pageTitle }: LayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header pageTitle={pageTitle} />
        <main className="flex-grow p-4 md:p-8">
          {children}
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}