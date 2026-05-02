import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, X, ChevronRight } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  balance: number;
}

interface UpgradeMachinePopupProps {
  onClose: () => void;
}

type SubView = null | "mining" | "capacity" | "cpu";

export default function UpgradeMachinePopup({ onClose }: UpgradeMachinePopupProps) {
  const [subView, setSubView] = useState<SubView>(null);
  const queryClient = useQueryClient();

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    retry: false,
    staleTime: 10000,
  });

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const upgradeMutation = useMutation({
    mutationFn: (type: string) =>
      apiRequest("POST", "/api/axn-mining/upgrade", { type }).then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      invalidate();
      setSubView(null);
    },
    onError: (e: any) => showNotification(e.message || "Upgrade failed", "error"),
  });

  if (!state) return null;

  const canAffordMining = state.balance >= state.upgMining;
  const canAffordCapacity = state.balance >= state.upgCapacity;
  const canAffordCpu = state.balance >= state.upgCpu;

  const nextMiningRate = (state.miningRate + 0.01).toFixed(2);
  const nextCapacity = state.capacity + 24;
  const nextCpuMin = state.cpuDurationSec / 60 + 30;

  const currentTitle =
    subView === "mining" ? "Mining Speed"
    : subView === "capacity" ? "Capacity"
    : subView === "cpu" ? "CPU Duration"
    : "Upgrade Machine";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center px-4"
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
          <div className="flex items-center justify-between px-4 pt-4 pb-3.5 border-b border-[#1c1c1e]">
            <button
              onClick={subView ? () => setSubView(null) : onClose}
              className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-white font-black text-sm uppercase tracking-wider">{currentTitle}</p>
              {!subView && <p className="text-white/25 text-[10px] mt-0.5">Balance: {state.balance.toFixed(2)} AXN</p>}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!subView && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15 }}
                className="px-4 py-4 space-y-2"
              >
                <UpgradeRow
                  label="Mining Speed"
                  sublabel="Earn more AXN per second"
                  level={state.miningLevel}
                  levelColor="#F5C542"
                  currentVal={`${state.miningRate}/s`}
                  nextVal={`${nextMiningRate}/s`}
                  cost={state.upgMining}
                  canAfford={canAffordMining}
                  isMax={state.miningLevel >= 25}
                  onClick={() => setSubView("mining")}
                />
                <UpgradeRow
                  label="Capacity"
                  sublabel="Store more AXN before collecting"
                  level={state.capacityLevel}
                  levelColor="#60a5fa"
                  currentVal={`${state.capacity} AXN`}
                  nextVal={`${nextCapacity} AXN`}
                  cost={state.upgCapacity}
                  canAfford={canAffordCapacity}
                  isMax={state.capacityLevel >= 25}
                  onClick={() => setSubView("capacity")}
                />
                <UpgradeRow
                  label="CPU Duration"
                  sublabel="Mine longer each session"
                  level={state.cpuLevel}
                  levelColor="#c084fc"
                  currentVal={`${state.cpuDurationSec / 60} min`}
                  nextVal={`${nextCpuMin} min`}
                  cost={state.upgCpu}
                  canAfford={canAffordCpu}
                  isMax={state.cpuLevel >= 25}
                  onClick={() => setSubView("cpu")}
                />
              </motion.div>
            )}

            {subView === "mining" && (
              <UpgradeDetail
                key="mining"
                description="Increase mining speed to earn more AXN per second."
                currentLevel={state.miningLevel}
                nextLevel={state.miningLevel + 1}
                currentLabel="Current rate"
                currentStat={`${state.miningRate}/sec`}
                improvedLabel="New rate"
                improvedStat={`${nextMiningRate}/sec`}
                cost={state.upgMining}
                canAfford={canAffordMining}
                isMax={state.miningLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("mining")}
              />
            )}

            {subView === "capacity" && (
              <UpgradeDetail
                key="capacity"
                description="Increase coin storage to hold more AXN before collecting."
                currentLevel={state.capacityLevel}
                nextLevel={state.capacityLevel + 1}
                currentLabel="Max capacity"
                currentStat={`${state.capacity} AXN`}
                improvedLabel="New capacity"
                improvedStat={`${nextCapacity} AXN`}
                cost={state.upgCapacity}
                canAfford={canAffordCapacity}
                isMax={state.capacityLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("capacity")}
              />
            )}

            {subView === "cpu" && (
              <UpgradeDetail
                key="cpu"
                description="Increase mining duration for longer continuous sessions."
                currentLevel={state.cpuLevel}
                nextLevel={state.cpuLevel + 1}
                currentLabel="Session length"
                currentStat={`${state.cpuDurationSec / 60} min`}
                improvedLabel="New session length"
                improvedStat={`${nextCpuMin} min`}
                cost={state.upgCpu}
                canAfford={canAffordCpu}
                isMax={state.cpuLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("cpu")}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface UpgradeRowProps {
  label: string;
  sublabel: string;
  level: number;
  levelColor: string;
  currentVal: string;
  nextVal: string;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  onClick: () => void;
}

function UpgradeRow({ label, sublabel, level, levelColor, currentVal, nextVal, cost, canAfford, isMax, onClick }: UpgradeRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMax}
      className="w-full text-left rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all disabled:opacity-50"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-sm font-bold">{label}</span>
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide"
              style={{ color: levelColor, background: `${levelColor}18` }}
            >
              Lv.{level}
            </span>
          </div>
          <p className="text-white/35 text-xs">{sublabel}</p>
          <p className="text-white/25 text-[10px] mt-1 tabular-nums">
            {currentVal}
            {!isMax && (
              <span style={{ color: `${levelColor}80` }}> → {nextVal}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {isMax ? (
            <span className="text-[10px] font-black text-[#F5C542]/50 uppercase">MAX</span>
          ) : (
            <span className={`text-xs font-black tabular-nums ${canAfford ? "text-[#F5C542]" : "text-white/30"}`}>
              {cost} AXN
            </span>
          )}
          {!isMax && <ChevronRight className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </div>
    </button>
  );
}

interface UpgradeDetailProps {
  description: string;
  currentLevel: number;
  nextLevel: number;
  currentLabel: string;
  currentStat: string;
  improvedLabel: string;
  improvedStat: string;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  isPending: boolean;
  onUpgrade: () => void;
}

function UpgradeDetail({
  description,
  currentLevel, nextLevel,
  currentLabel, currentStat,
  improvedLabel, improvedStat,
  cost, canAfford, isMax, isPending, onUpgrade,
}: UpgradeDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15 }}
      className="px-4 py-4 space-y-3"
    >
      <p className="text-white/40 text-xs leading-relaxed">{description}</p>

      <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs font-bold uppercase tracking-wider">Level</span>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm font-black">{currentLevel}</span>
            <span className="text-white/20 text-xs">→</span>
            <span className="text-[#F5C542] text-sm font-black">{nextLevel}</span>
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <span className="text-white/35 text-xs">{currentLabel}</span>
          <span className="text-white text-xs font-bold tabular-nums">{currentStat}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#F5C542]/60 text-xs">{improvedLabel}</span>
          <span className="text-[#F5C542] text-xs font-black tabular-nums">{improvedStat}</span>
        </div>
      </div>

      {isMax ? (
        <div className="w-full h-12 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white/25 text-sm font-black uppercase tracking-wider">Maximum Level Reached</span>
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={isPending || !canAfford}
          className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canAfford ? {
            background: "linear-gradient(135deg, #F5C542, #d4920a)",
            color: "#000",
            boxShadow: "0 0 20px rgba(245,197,66,0.25)",
          } : {
            background: "#1c1c1e",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : canAfford ? (
            `Upgrade — ${cost} AXN`
          ) : (
            `Need ${cost} AXN`
          )}
        </button>
      )}
    </motion.div>
  );
}
