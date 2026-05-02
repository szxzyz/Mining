import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Clock, Play, X } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const FREE_COOLDOWN_KEY = "antivirus_free_used_at";
const AV_ACTIVE_KEY = "av_activated_at";
const COOLDOWN_MS = 35 * 60 * 1000;
export const AV_DURATION_MS = 2 * 60 * 1000;

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(FREE_COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AntivirusPopupProps {
  antivirusCost: number;
  antivirusActive: boolean;
  balance: number;
  onClose: () => void;
}

export default function AntivirusPopup({ antivirusCost, antivirusActive, balance, onClose }: AntivirusPopupProps) {
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

  const paidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/toggle-antivirus").then((r) => r.json()),
    onSuccess: (d) => {
      if (d.active) {
        localStorage.setItem(AV_ACTIVE_KEY, String(Date.now()));
        showNotification("Antivirus activated for 2 minutes!", "success");
      } else {
        localStorage.removeItem(AV_ACTIVE_KEY);
        showNotification("Antivirus deactivated.", "info");
      }
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const freeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/antivirus-free").then((r) => r.json()),
    onSuccess: () => {
      localStorage.setItem(AV_ACTIVE_KEY, String(Date.now()));
      localStorage.setItem(FREE_COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      showNotification("Antivirus activated for 2 minutes! (Free)", "success");
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const handleFreeActivate = async () => {
    if (adWatching) return;
    setAdWatching(true);
    try {
      if (typeof (window as any).show_10401872 === "function") {
        try { await (window as any).show_10401872(); } catch {}
      } else if (typeof (window as any).Adsgram !== "undefined") {
        try { await (window as any).Adsgram.init({ blockId: "int-20373" }).show(); } catch {}
      }
      freeMutation.mutate();
    } catch {
      showNotification("Ad failed. Try again.", "error");
    } finally {
      setAdWatching(false);
    }
  };

  const canAfford = balance >= antivirusCost;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: '#0a0a0a', border: '1px solid #1c1c1e' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-wider">Antivirus</p>
                <p className="text-white/30 text-[10px]">Protects machine for 2 minutes</p>
              </div>
            </div>
            <div className="w-8" />
          </div>

          <div className="px-5 py-5 space-y-3">
            {/* Status indicator */}
            <div className="bg-[#1c1c1e] rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-white/40 text-xs">Status</span>
              {antivirusActive ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-black text-sm">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-red-400 font-black text-sm">Exposed</span>
                </div>
              )}
            </div>

            {/* Duration info */}
            <div className="bg-[#1c1c1e] rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <span className="text-white/40 text-xs">Protection Duration</span>
              </div>
              <span className="text-green-400 font-black text-sm">2 minutes</span>
            </div>

            {antivirusActive ? (
              <div className="w-full h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-black text-sm">System Protected</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleFreeActivate}
                  disabled={cooldown > 0 || adWatching || freeMutation.isPending}
                  className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: '#1c1c1e', border: '1px solid #2a2a2a', color: 'white' }}
                >
                  {freeMutation.isPending || adWatching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : cooldown > 0 ? (
                    <><Clock className="w-4 h-4 text-white/40" /> <span className="text-white/40">Free in {formatCooldown(cooldown)}</span></>
                  ) : (
                    <><Play className="w-4 h-4 text-white/70" /> Free — Watch Ad</>
                  )}
                </button>

                <button
                  onClick={() => paidMutation.mutate()}
                  disabled={paidMutation.isPending || !canAfford}
                  className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={canAfford ? {
                    background: "linear-gradient(135deg, #22c55e, #15803d)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(34,197,94,0.2)",
                  } : {
                    background: "#1c1c1e",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {paidMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : canAfford ? (
                    `Pay ${antivirusCost} AXN`
                  ) : (
                    `Need ${antivirusCost} AXN`
                  )}
                </button>

                {cooldown > 0 && (
                  <p className="text-white/20 text-[10px] text-center">
                    Free cooldown: {formatCooldown(cooldown)} remaining
                  </p>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white/50 active:scale-[0.97] transition-transform"
              style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
