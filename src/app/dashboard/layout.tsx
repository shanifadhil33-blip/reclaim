import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SidebarNav from "./SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar App Shell */}
      <aside className="w-64 border-r border-white/10 bg-neutral-900/40 backdrop-blur-2xl flex flex-col justify-between hidden md:flex shrink-0 z-20 relative">
        <div className="p-6">
          <div className="text-2xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400 mb-10">
            Reclaim
          </div>
          
          <SidebarNav />
        </div>

        <div className="p-6 border-t border-white/5 text-sm text-neutral-500">
           <p className="truncate text-xs text-neutral-400">{user.email}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative h-screen">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 w-full h-full px-6 lg:px-10 py-8">
          {children}
        </div>
      </main>

    </div>
  );
}
