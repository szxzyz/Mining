import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ClipboardList } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav }: LayoutProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/offers", label: "Offers", icon: ClipboardList },
  ];

  return (
    <div className="h-dvh bg-[#0d0f14] text-foreground font-sans selection:bg-[#4cd3ff]/30 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          className="relative"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)", background: "#0d0f14" }}
        >
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-stretch">
              {navItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors active:opacity-70"
                    style={{ minHeight: 56 }}
                  >
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-5 py-1.5 rounded-xl transition-all"
                      style={{
                        background: isActive ? "#1a1c22" : "transparent",
                      }}
                    >
                      <Icon
                        style={{
                          width: 22,
                          height: 22,
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.35)",
                          strokeWidth: isActive ? 2 : 1.5,
                        }}
                      />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.35)" }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
