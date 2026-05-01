import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Loader2, Clock, Play } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const COOLDOWN_KEY = "repair_free_used_at";
const COOLDOWN_MS = 35 * 60 * 1000;

interface RepairPopupProps {
  repairCost: number;
  machineHealth: number;
  balance: number;
  onClose: () => void;
}

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RepairPopup({ repairCost, machineHealth, balance, onClose }: RepairPopupProps) {
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(getRemainingCooldown);
  const [adWatching, setAdWatching] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldown(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const repairPaidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair").then((r) => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); onClose(); },
    onError: (e: any) => showNotification(e.message || "Repair failed", "error"),
  });

  const repairFreeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair-free").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Repair failed", "error"),
  });

  const handleFreeRepair = async () => {
    if (adWatching) return;
    setAdWatching(true);
    try {
      if (typeof (window as any).show_10401872 === "function") {
        try { await (window as any).show_10401872(); } catch {}
      } else if (typeof (window as any).Adsgram !== "undefined") {
        try { await (window as any).Adsgram.init({ blockId: "int-20373" }).show(); } catch {}
      }
      repairFreeMutation.mutate();
    } catch {
      showNotification("Ad failed. Try again.", "error");
    } finally {
      setAdWatching(false);
    }
  };

  const canAfford = balance >= repairCost;
  const isFullHealth = machineHealth >= 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm bg-[#0e0e0e] border border-[#222] rounded-3xl overflow-hidden"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="flex flex-col items-center px-5 pt-6 pb-4 border-b border-[#1a1a1a]">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-white font-black text-base uppercase tracking-wider">Repair Machine</p>
            <p className="text-white/30 text-[11px] mt-1">Restore machine health to 100%</p>
          </div>

          <div className="px-5 py-5 space-y-3">
            {/* Health indicator */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-white/40 text-xs">Current Health</span>
              <span className="text-red-400 font-black text-sm tabular-nums">{machineHealth}%</span>
            </div>

            {isFullHealth ? (
              <div className="w-full h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="text-green-400 font-black text-sm">Machine is already at 100%</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleFreeRepair}
                  disabled={cooldown > 0 || adWatching || repairFreeMutation.isPending}
                  className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#161616] border border-[#2a2a2a] text-white"
                >
                  {repairFreeMutation.isPending || adWatching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : cooldown > 0 ? (
                    <><Clock className="w-4 h-4 text-white/40" /> <span className="text-white/40">Free in {formatCooldown(cooldown)}</span></>
                  ) : (
                    <><Play className="w-4 h-4 text-white/70" /> Free — Watch Ad</>
                  )}
                </button>

                <button
                  onClick={() => repairPaidMutation.mutate()}
                  disabled={repairPaidMutation.isPending || !canAfford}
                  className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={canAfford ? {
                    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(239,68,68,0.2)",
                  } : {
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {repairPaidMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : canAfford ? (
                    `Pay ${repairCost} AXN`
                  ) : (
                    `Need ${repairCost} AXN`
                  )}
                </button>

                {cooldown > 0 && (
                  <p className="text-white/20 text-[10px] text-center">
                    Free cooldown: {formatCooldown(cooldown)} remaining
                  </p>
                )}
              </>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 bg-white/[0.03] border border-white/[0.06] active:scale-[0.97] transition-transform"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
