import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Shield, ShieldOff, Cpu, HardDrive, Activity,
  Wrench, AlertTriangle, Play,
  Loader2, Info, Clock
} from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import RepairPopup from "@/components/RepairPopup";
import AntivirusPopup, { AV_DURATION_MS } from "@/components/AntivirusPopup";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  minedAxn: number;
  cpuRunning: boolean;
  cpuRemainingSeconds: number;
  hasEnergy: boolean;
  antivirusActive: boolean;
  machineHealth: number;
  energyCost: number;
  repairCost: number;
  antivirusCost: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  isMaxLevel: boolean;
  balance: number;
  pendingVirusDamage: number;
  nextVirusIn: number;
}

const AV_ACTIVE_KEY = "av_activated_at";
const AV_DURATION_SECONDS = AV_DURATION_MS / 1000; // 5 minutes

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function MiningMachinePanel() {
  const queryClient = useQueryClient();
  const [cpuCountdown, setCpuCountdown] = useState(0);
  const [repairOpen, setRepairOpen] = useState(false);
  const [antivirusOpen, setAntivirusOpen] = useState(false);

  const { data: state, isLoading } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    refetchInterval: 15000,
    retry: false,
  });

  // Sync CPU countdown from server — then tick independently
  useEffect(() => {
    if (!state) return;
    if (state.cpuRunning && state.cpuRemainingSeconds > 0) {
      setCpuCountdown(state.cpuRemainingSeconds);
    } else if (!state.cpuRunning) {
      setCpuCountdown(0);
    }
  }, [state?.cpuRemainingSeconds, state?.cpuRunning]);

  // CPU timer always ticks continuously (even when capacity full / health 0)
  useEffect(() => {
    if (cpuCountdown <= 0) return;
    const t = setInterval(() => setCpuCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cpuCountdown > 0]);

  const [localMined, setLocalMined] = useState(0);
  useEffect(() => {
    if (state) setLocalMined(state.minedAxn);
  }, [state?.minedAxn]);

  // Mining accumulation — stops when health = 0 or capacity full; CPU continues
  useEffect(() => {
    if (!state?.cpuRunning || !state?.miningRate) return;
    if (state.machineHealth <= 0) return; // health 0: no mining
    const t = setInterval(() => {
      setLocalMined(prev => {
        if (prev >= state.capacity) return prev; // capacity full: stop accumulating
        return Math.min(prev + state.miningRate, state.capacity);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state?.cpuRunning, state?.miningRate, state?.capacity, state?.machineHealth]);

  // Antivirus 5-minute countdown
  const [avSecondsLeft, setAvSecondsLeft] = useState(0);
  const avIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAvCountdown = useCallback((activatedAt: number) => {
    if (avIntervalRef.current) clearInterval(avIntervalRef.current);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - activatedAt) / 1000);
      const remaining = AV_DURATION_SECONDS - elapsed;
      if (remaining <= 0) {
        setAvSecondsLeft(0);
        if (avIntervalRef.current) clearInterval(avIntervalRef.current);
        // Auto-deactivate on server
        antivirusDeactivateMutation.mutate();
      } else {
        setAvSecondsLeft(remaining);
      }
    };
    tick();
    avIntervalRef.current = setInterval(tick, 1000);
  }, []);

  const antivirusDeactivateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/toggle-antivirus").then(r => r.json()),
    onSuccess: () => {
      localStorage.removeItem(AV_ACTIVE_KEY);
      if (avIntervalRef.current) clearInterval(avIntervalRef.current);
      setAvSecondsLeft(0);
      queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    },
    onError: () => {},
  });

  useEffect(() => {
    if (!state) return;
    if (state.antivirusActive) {
      const stored = localStorage.getItem(AV_ACTIVE_KEY);
      if (stored) {
        const activatedAt = parseInt(stored, 10);
        const elapsed = Math.floor((Date.now() - activatedAt) / 1000);
        if (elapsed < AV_DURATION_SECONDS) {
          startAvCountdown(activatedAt);
        } else {
          localStorage.removeItem(AV_ACTIVE_KEY);
          antivirusDeactivateMutation.mutate();
        }
      } else {
        const now = Date.now();
        localStorage.setItem(AV_ACTIVE_KEY, String(now));
        startAvCountdown(now);
      }
    } else {
      if (avIntervalRef.current) clearInterval(avIntervalRef.current);
      setAvSecondsLeft(0);
      localStorage.removeItem(AV_ACTIVE_KEY);
    }
  }, [state?.antivirusActive]);

  const invalidate = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const startCpuMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/start-cpu").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/claim").then(r => r.json()),
    onSuccess: (d) => {
      showNotification(`+${d.amount?.toFixed(2)} AXN claimed!`, "success");
      setLocalMined(0);
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || "Nothing to claim", "error"),
  });

  const refillMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#F5C542]" />
      </div>
    );
  }

  if (!state) return null;

  const capacityPct = Math.min(100, (localMined / state.capacity) * 100);
  const healthColor = state.machineHealth > 60 ? "#22c55e" : state.machineHealth > 30 ? "#f59e0b" : "#ef4444";
  const canClaim = localMined >= 0.01;

  const energyPct = state.cpuRunning
    ? Math.max(0, Math.round((cpuCountdown / state.cpuDurationSec) * 100))
    : state.hasEnergy ? 100 : 0;

  const isMiningHalted = state.machineHealth <= 0 && state.cpuRunning;

  return (
    <div className="w-full space-y-3">
      {/* Health Warning — Mining halted */}
      <AnimatePresence>
        {state.machineHealth <= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-950/60 border border-red-500/30 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs font-bold">Machine broken — Mining stopped! Repair to resume.</p>
            </div>
          </motion.div>
        )}
        {state.machineHealth > 0 && state.machineHealth < 40 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-950/60 border border-amber-500/30 rounded-xl px-4 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-xs font-semibold">
                Health critical ({state.machineHealth}%)! Repair soon.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Machine Card */}
      <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F5C542]/10 flex items-center justify-center">
              <span className="text-base">⛏️</span>
            </div>
            <div>
              <p className="text-white text-sm font-black leading-none">AXN Mining Rig</p>
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                Mining Lv.{state.miningLevel} · Cap Lv.{state.capacityLevel} · CPU Lv.{state.cpuLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Mining Display */}
        <div className="px-4 py-4">
          {/* Mined AXN */}
          <div className="text-center mb-4">
            <div
              className="text-4xl font-black tabular-nums tracking-tight"
              style={{ color: state.cpuRunning && state.machineHealth > 0 ? '#4ade80' : '#ffffff60' }}
            >
              {localMined.toFixed(2)}
            </div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">AXN Mined</p>
            {isMiningHalted && (
              <p className="text-red-400 text-[10px] font-bold mt-1">Mining halted — health at 0%</p>
            )}
          </div>

          {/* Capacity Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-[#F5C542]" />
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Capacity</span>
              </div>
              <span className="text-white/60 text-[10px] font-black tabular-nums">
                {localMined.toFixed(2)} / {state.capacity} AXN
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: capacityPct > 90 ? '#ef4444' : 'linear-gradient(90deg,#F5C542,#d4920a)' }}
                animate={{ width: `${capacityPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Mining Rate */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Activity className="w-3.5 h-3.5 text-[#F5C542] mx-auto mb-1" />
              <p className="text-white text-xs font-black tabular-nums">{state.miningRate}/s</p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Rate</p>
            </div>
            {/* CPU Timer — always runs, even if capacity full / health 0 */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Cpu className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <p className={`text-xs font-black tabular-nums ${state.cpuRunning ? 'text-blue-300' : 'text-white/40'}`}>
                {state.cpuRunning ? formatTime(cpuCountdown) : 'Idle'}
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">CPU</p>
            </div>
            {/* Machine Health */}
            <div className="bg-[#161616] rounded-xl p-2.5 text-center border border-[#1e1e1e]">
              <Wrench className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: healthColor }} />
              <p className="text-xs font-black tabular-nums" style={{ color: healthColor }}>
                {state.machineHealth}%
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Health</p>
              <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${state.machineHealth}%`, background: healthColor }}
                />
              </div>
            </div>
          </div>

          {/* Energy Bar */}
          <div className="flex items-center gap-3 bg-[#161616] rounded-xl px-3 py-2.5 border border-[#1e1e1e] mb-4">
            <div className="flex items-center gap-1.5 flex-1">
              <Zap
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: energyPct > 60 ? '#F5C542' : energyPct > 20 ? '#f59e0b' : energyPct > 0 ? '#ef4444' : 'rgba(255,255,255,0.15)' }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Energy</span>
                  <span
                    className="text-[10px] font-black tabular-nums"
                    style={{ color: energyPct > 60 ? '#F5C542' : energyPct > 20 ? '#f59e0b' : energyPct > 0 ? '#ef4444' : '#f87171' }}
                  >
                    {energyPct}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${energyPct}%` }}
                    transition={{ duration: 0.8, ease: "linear" }}
                    style={{
                      background: energyPct > 60
                        ? 'linear-gradient(90deg,#F5C542,#d4920a)'
                        : energyPct > 20
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : energyPct > 0
                        ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                        : 'rgba(239,68,68,0.3)',
                    }}
                  />
                </div>
                <p className="text-white/25 text-[9px] mt-1">
                  {state.cpuRunning
                    ? `⚡ Mining — ${energyPct}% remaining`
                    : energyPct === 100
                    ? '⚡ Full — Ready to mine'
                    : '🪫 Empty — Refill to continue'}
                </p>
              </div>
            </div>
            {!state.cpuRunning && !state.hasEnergy && (
              <button
                onClick={() => refillMutation.mutate()}
                disabled={refillMutation.isPending}
                className="flex-shrink-0 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-black active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#F5C542,#d4920a)' }}
              >
                {refillMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `+${state.energyCost} AXN`}
              </button>
            )}
          </div>

          {/* Antivirus warning banner */}
          <div className="mb-4">
            {state.antivirusActive ? (
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/25 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-green-400 text-[11px] font-black uppercase tracking-wider">System Protected</p>
                    <p className="text-green-400/50 text-[9px] font-semibold mt-0.5">Antivirus active — no threats detected</p>
                  </div>
                </div>
                {avSecondsLeft > 0 && (
                  <div className="flex items-center gap-1 bg-green-500/20 rounded-lg px-2 py-1">
                    <Clock className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-[10px] font-black tabular-nums">{formatTime(avSecondsLeft)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-red-400 animate-pulse" />
                  <div>
                    <p className="text-red-400 text-[11px] font-black uppercase tracking-wider">⚠ System Exposed</p>
                    <p className="text-red-400/50 text-[9px] font-semibold mt-0.5">Virus detected — machine at risk</p>
                  </div>
                </div>
                <button
                  onClick={() => setAntivirusOpen(true)}
                  className="text-[9px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg active:scale-95 transition-transform"
                >
                  Fix Now
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Start CPU / Claim row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => startCpuMutation.mutate()}
                disabled={
                  startCpuMutation.isPending ||
                  state.cpuRunning ||
                  !state.hasEnergy ||
                  state.machineHealth <= 0
                }
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  !state.cpuRunning && state.hasEnergy && state.machineHealth > 0
                    ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', boxShadow: '0 0 14px rgba(59,130,246,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }
                }
              >
                {startCpuMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : state.cpuRunning ? (
                  <><Cpu className="w-3.5 h-3.5" /> Running</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Start Mining</>
                )}
              </button>

              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !canClaim}
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={canClaim ? {
                  background: 'linear-gradient(135deg,#F5C542,#d4920a)',
                  color: '#000',
                  boxShadow: '0 0 14px rgba(245,197,66,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {claimMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⬇ Claim AXN'}
              </button>
            </div>

            {/* Repair + Antivirus row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRepairOpen(true)}
                disabled={state.machineHealth >= 100}
                className="h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={state.machineHealth < 100 ? {
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                <Wrench className="w-3 h-3" /> Repair
              </button>

              <button
                onClick={() => setAntivirusOpen(true)}
                disabled={state.antivirusActive}
                className="h-9 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40"
                style={state.antivirusActive ? {
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  color: '#4ade80',
                } : {
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                {state.antivirusActive ? (
                  <><Shield className="w-3 h-3" /> AV Active</>
                ) : (
                  <><ShieldOff className="w-3 h-3" /> Antivirus</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5" />
        <p className="text-white/25 text-[10px] leading-relaxed">
          Start mining to earn AXN. Claim before capacity fills.
          Antivirus lasts 5 minutes — reactivate when needed.
          Mining stops if health reaches 0% — repair to continue.
        </p>
      </div>

      {/* Popups */}
      {repairOpen && (
        <RepairPopup
          repairCost={state.repairCost}
          machineHealth={state.machineHealth}
          balance={state.balance}
          onClose={() => setRepairOpen(false)}
        />
      )}
      {antivirusOpen && (
        <AntivirusPopup
          antivirusCost={state.antivirusCost}
          antivirusActive={state.antivirusActive}
          balance={state.balance}
          onClose={() => setAntivirusOpen(false)}
        />
      )}
    </div>
  );
}
