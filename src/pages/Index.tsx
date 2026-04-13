import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background grid-bg flex">
      <AppSidebar />
      <div className="flex-1 min-h-screen overflow-auto">
        <div className="scan-line fixed inset-0 pointer-events-none z-40 h-32" />
        <Outlet />
      </div>
    </div>
  );
};

export default Index;
