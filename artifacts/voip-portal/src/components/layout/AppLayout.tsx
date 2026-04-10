import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: ReactNode;
  role: "admin" | "reseller";
  title?: string;
}

export function AppLayout({ children, role, title }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-ambient flex">
      <Sidebar role={role} />
      <div className="flex-1 ml-56 flex flex-col relative z-10">
        {title && (
          <header className="h-20 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center px-8">
            <h1 className="text-2xl font-display font-semibold text-foreground tracking-tight">{title}</h1>
          </header>
        )}
        <motion.main 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
