import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, HardDrive, Cpu, ArrowRight, Loader2 } from "lucide-react";
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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center px-4"
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
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
            {subView ? (
              <button
                onClick={() => setSubView(null)}
                className="text-white/40 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/5 active:scale-90 transition-transform"
              >
                Back
              </button>
            ) : (
              <div className="w-12" />
            )}
            <div className="text-center">
              <p className="text-white font-black text-sm uppercase tracking-wider">
                {subView === "mining" ? "Mining Speed" : subView === "capacity" ? "Capacity" : subView === "cpu" ? "CPU Duration" : "Upgrade Machine"}
              </p>
              {!subView && (
                <p className="text-white/30 text-[10px] mt-0.5">Select what to upgrade</p>
              )}
            </div>
            <div className="w-12" />
          </div>

          {/* Main options */}
          <AnimatePresence mode="wait">
            {!subView && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="px-5 py-5 space-y-3"
              >
                <UpgradeOption
                  icon={<Activity className="w-5 h-5 text-[#F5C542]" />}
                  title="Mining Speed"
                  desc="Earn more coins per second"
                  currentValue={`${state.miningRate}/sec`}
                  nextValue={`${nextMiningRate}/sec`}
                  cost={state.upgMining}
                  isMax={state.miningLevel >= 25}
                  level={state.miningLevel}
                  canAfford={canAffordMining}
                  onClick={() => setSubView("mining")}
                />
                <UpgradeOption
                  icon={<HardDrive className="w-5 h-5 text-blue-400" />}
                  title="Capacity"
                  desc="Store more coins before claiming"
                  currentValue={`${state.capacity} AXN`}
                  nextValue={`${nextCapacity} AXN`}
                  cost={state.upgCapacity}
                  isMax={state.capacityLevel >= 25}
                  level={state.capacityLevel}
                  canAfford={canAffordCapacity}
                  onClick={() => setSubView("capacity")}
                />
                <UpgradeOption
                  icon={<Cpu className="w-5 h-5 text-purple-400" />}
                  title="CPU Duration"
                  desc="Mine longer with better efficiency"
                  currentValue={`${state.cpuDurationSec / 60} min`}
                  nextValue={`${nextCpuMin} min`}
                  cost={state.upgCpu}
                  isMax={state.cpuLevel >= 25}
                  level={state.cpuLevel}
                  canAfford={canAffordCpu}
                  onClick={() => setSubView("cpu")}
                />

                <p className="text-white/20 text-[10px] text-center pt-1">
                  Balance: {state.balance.toFixed(2)} AXN
                </p>

                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 bg-white/[0.03] border border-white/[0.06] active:scale-[0.97] transition-transform"
                >
                  Close
                </button>
              </motion.div>
            )}

            {subView === "mining" && (
              <SubView
                key="mining"
                icon={<Activity className="w-6 h-6 text-[#F5C542]" />}
                title="Mining Speed"
                description="Increase mining speed to earn more coins per second."
                currentLevel={state.miningLevel}
                nextLevel={state.miningLevel + 1}
                currentLabel="Your income"
                currentStat={`${state.miningRate}/sec`}
                improvedLabel="Improved income"
                improvedStat={`${nextMiningRate}/sec`}
                cost={state.upgMining}
                canAfford={canAffordMining}
                isMax={state.miningLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("mining")}
                onClose={onClose}
              />
            )}

            {subView === "capacity" && (
              <SubView
                key="capacity"
                icon={<HardDrive className="w-6 h-6 text-blue-400" />}
                title="Capacity"
                description="Increase coin storage to accumulate more before collecting."
                currentLevel={state.capacityLevel}
                nextLevel={state.capacityLevel + 1}
                currentLabel="Your max capacity"
                currentStat={`${state.capacity} AXN`}
                improvedLabel="Increased max capacity"
                improvedStat={`${nextCapacity} AXN`}
                cost={state.upgCapacity}
                canAfford={canAffordCapacity}
                isMax={state.capacityLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("capacity")}
                onClose={onClose}
              />
            )}

            {subView === "cpu" && (
              <SubView
                key="cpu"
                icon={<Cpu className="w-6 h-6 text-purple-400" />}
                title="CPU Duration"
                description="Increase mining duration for longer runs with better energy usage."
                currentLevel={state.cpuLevel}
                nextLevel={state.cpuLevel + 1}
                currentLabel="Your max mining"
                currentStat={`${state.cpuDurationSec / 60} min`}
                improvedLabel="Increased max mining"
                improvedStat={`${nextCpuMin} min`}
                cost={state.upgCpu}
                canAfford={canAffordCpu}
                isMax={state.cpuLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("cpu")}
                onClose={onClose}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface UpgradeOptionProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  currentValue: string;
  nextValue: string;
  cost: number;
  isMax: boolean;
  level: number;
  canAfford: boolean;
  onClick: () => void;
}

function UpgradeOption({ icon, title, desc, currentValue, nextValue, cost, isMax, level, canAfford, onClick }: UpgradeOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMax}
      className="w-full flex items-center gap-4 bg-[#161616] border border-[#222] rounded-2xl px-4 py-3.5 text-left active:scale-[0.98] transition-all disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-bold">{title}</p>
          <span className="text-white/30 text-[10px] font-semibold">Lv.{level}</span>
        </div>
        <p className="text-white/40 text-xs mt-0.5">{desc}</p>
        <p className="text-white/30 text-[10px] mt-1 tabular-nums">
          {currentValue}
          {!isMax && <span className="text-[#F5C542]/60"> → {nextValue}</span>}
        </p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {isMax ? (
          <span className="text-[10px] font-black text-[#F5C542]/60 uppercase">MAX</span>
        ) : (
          <>
            <span className={`text-xs font-black tabular-nums ${canAfford ? "text-[#F5C542]" : "text-white/30"}`}>
              {cost} AXN
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-white/20" />
          </>
        )}
      </div>
    </button>
  );
}

interface SubViewProps {
  icon: React.ReactNode;
  title: string;
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
  onClose: () => void;
}

function SubView({
  icon, description,
  currentLevel, nextLevel,
  currentLabel, currentStat,
  improvedLabel, improvedStat,
  cost, canAfford, isMax, isPending, onUpgrade, onClose,
}: SubViewProps) {
  return (
    <motion.div
      key="sub"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
      className="px-5 py-5 space-y-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <p className="text-white/50 text-sm leading-relaxed pt-1">{description}</p>
      </div>

      <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">Level up</span>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm font-black">{currentLevel}</span>
            <span className="text-white/20">→</span>
            <span className="text-[#F5C542] text-sm font-black">{nextLevel}</span>
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-xs">{currentLabel}</span>
          <span className="text-white text-xs font-bold tabular-nums">{currentStat}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#F5C542]/70 text-xs">{improvedLabel}</span>
          <span className="text-[#F5C542] text-xs font-black tabular-nums">{improvedStat}</span>
        </div>
      </div>

      {isMax ? (
        <div className="w-full h-13 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          <span className="text-white/30 text-sm font-black uppercase tracking-wider">Maximum Level</span>
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={isPending || !canAfford}
          className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canAfford ? {
            background: "linear-gradient(135deg, #F5C542, #d4920a)",
            color: "#000",
            boxShadow: "0 0 20px rgba(245,197,66,0.3)",
          } : {
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : canAfford ? (
            `Upgrade — ${cost} AXN`
          ) : (
            `Not enough AXN (need ${cost})`
          )}
        </button>
      )}

      <button
        onClick={onClose}
        className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 bg-white/[0.03] border border-white/[0.06] active:scale-[0.97] transition-transform"
      >
        Close
      </button>
    </motion.div>
  );
}
