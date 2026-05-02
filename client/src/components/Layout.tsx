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
    <div className="min-h-screen bg-[#0d0f14] text-foreground font-sans selection:bg-[#4cd3ff]/30 relative overflow-hidden">
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
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
        >
          <div className="max-w-md mx-auto px-4">
            <div
              className="flex items-stretch rounded-2xl overflow-hidden"
              style={{ background: "#0d0f14", border: "1px solid #22252d" }}
            >
              {navItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-white/5"
                    style={{ minHeight: 56 }}
                  >
                    <Icon
                      style={{
                        width: 20,
                        height: 20,
                        color: isActive ? "#F5C542" : "rgba(255,255,255,0.3)",
                        strokeWidth: isActive ? 2.2 : 1.6,
                      }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: isActive ? "#F5C542" : "rgba(255,255,255,0.3)" }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-[10px] w-1 h-1 rounded-full bg-[#F5C542]"
                        style={{ position: "relative", bottom: "auto", marginTop: 1 }}
                      />
                    )}
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
