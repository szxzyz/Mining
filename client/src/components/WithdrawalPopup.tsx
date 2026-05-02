import { useState, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { MdOndemandVideo } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface WithdrawalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonBalance: number;
}

export default function WithdrawalPopup({ open, onOpenChange, tonBalance }: WithdrawalPopupProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showAdPopup, setShowAdPopup] = useState(false);

  const { data: appSettings } = useQuery<any>({
    queryKey: ['/api/app-settings'],
    staleTime: 30000,
  });

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    staleTime: 0,
  });

  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const minWithdraw = appSettings?.minimum_withdrawal_sat ? parseFloat(appSettings.minimum_withdrawal_sat) : 20;
  const networkFee = appSettings?.withdrawal_fee_sat ? parseFloat(appSettings.withdrawal_fee_sat) : 10;
  const withdrawAdsRequired = appSettings?.withdraw_ads_required === true || appSettings?.withdraw_ads_required === "true";
  const adsWatchedToday: number = (user?.adsWatchedToday || 0) + (user?.adSection1Count || 0) + (user?.adSection2Count || 0);
  const adsRequiredCount = 100;
  const adsShortfall = Math.max(0, adsRequiredCount - adsWatchedToday);
  const canWithdrawAds = !withdrawAdsRequired || adsWatchedToday >= adsRequiredCount;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: withdrawAddress,
        amount: parseFloat(withdrawAmount).toString(),
        method: "AXN"
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Withdrawal request submitted successfully", "success");
      onOpenChange(false);
      setWithdrawAddress("");
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    },
    onError: (error: any) => {
      let message = "Withdrawal failed";
      try {
        if (typeof error.message === 'string') {
          const trimmed = error.message.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            if (parsed.message) message = parsed.message;
          } else {
            message = error.message;
          }
        }
      } catch (e) {
        message = error.message;
      }
      showNotification(message, "error");
    },
  });

  const handleWithdrawClick = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < minWithdraw) {
      showNotification(`Minimum withdrawal amount is ${minWithdraw} AXN`, "error");
      return;
    }
    if (amount > satBalance) {
      showNotification(`Insufficient balance. Available: ${satBalance} AXN`, "error");
      return;
    }
    if (!withdrawAddress.trim()) {
      showNotification("Please enter your destination address", "error");
      return;
    }
    if (!withdrawAddress.trim().endsWith("@speed.app")) {
      showNotification("Address must end with @speed.app", "error");
      return;
    }
    if (!canWithdrawAds) {
      setShowAdPopup(true);
      return;
    }
    withdrawMutation.mutate();
  };

  const toReceive = withdrawAmount ? Math.max(0, parseFloat(withdrawAmount) - networkFee).toFixed(0) : "0";

  const handleMaxClick = () => {
    setWithdrawAmount(satBalance.toString());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            style={{ maxHeight: "90vh", overflowY: "auto", background: '#0a0a0a', borderTop: '1px solid #1c1c1e', borderLeft: '1px solid #1c1c1e', borderRight: '1px solid #1c1c1e' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c1c1e]">
              <div className="w-12" />
              <h2 className="text-white font-black text-base uppercase tracking-wider">AXN Withdrawal</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 px-3 rounded-xl bg-[#1c1c1e] text-white/60 text-xs font-bold active:scale-90 transition-transform"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ background: '#1c1c1e' }}>
                <span className="text-white/50 text-xs font-semibold">Available Balance</span>
                <div className="flex items-center gap-1.5">
                  <img src="/axn-logo.svg" alt="AXN" className="w-4 h-4" />
                  <span className="text-yellow-400 text-sm font-black tabular-nums">
                    {satBalance.toLocaleString()} AXN
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Destination address
                  </Label>
                  <a
                    href="https://links.speed.app/referral?referral_code=CH265L"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 text-[10px] font-semibold hover:text-yellow-300 transition-colors underline underline-offset-2"
                    onClick={(e) => {
                      if (window.Telegram?.WebApp) {
                        e.preventDefault();
                        window.Telegram.WebApp.openLink("https://links.speed.app/referral?referral_code=CH265L");
                      }
                    }}
                  >
                    Don't have an address yet?
                  </a>
                </div>
                <Input
                  placeholder="lightning"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-yellow-400/30 font-medium text-sm placeholder:text-white/20 placeholder:text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  Amount (AXN)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-11 rounded-xl font-bold text-sm pr-16 placeholder:text-white/20"
                  />
                  <button
                    onClick={handleMaxClick}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-black rounded-lg transition-all uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#1c1c1e' }}>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">Withdraw Fee</span>
                  <span className="text-white text-xs font-bold">{networkFee} AXN</span>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">Min. Withdrawal</span>
                  <span className="text-white text-xs font-bold">{minWithdraw} AXN</span>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-semibold">You Receive</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-black tabular-nums">
                      {parseInt(toReceive).toLocaleString()} AXN
                    </span>
                    <img src="/axn-logo.svg" alt="AXN" className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-11 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 border-0"
                onClick={handleWithdrawClick}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Withdraw AXN"
                )}
              </Button>

              <button
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-2xl font-bold text-sm text-white/50 active:scale-[0.97] transition-transform"
                style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Close
              </button>
            </div>

            <div className="h-4" />
          </motion.div>
        </motion.div>
      )}

      {/* Ad Required Popup */}
      <AnimatePresence>
        {showAdPopup && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-xs rounded-3xl overflow-hidden"
              style={{ background: '#0a0a0a', border: '1px solid #1c1c1e' }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
            >
              {/* Header with Back + Close */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1c1c1e]">
                <button
                  onClick={() => setShowAdPopup(false)}
                  className="w-7 h-7 rounded-xl bg-[#1c1c1e] flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-white/60" />
                </button>
                <span className="text-white font-black text-sm uppercase tracking-wider">Almost There!</span>
                <button
                  onClick={() => setShowAdPopup(false)}
                  className="w-7 h-7 rounded-xl bg-[#1c1c1e] flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
              <div className="px-5 py-5">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <MdOndemandVideo className="w-10 h-10" style={{ color: "#34d399" }} />
                </div>
                <p className="text-white/50 text-xs leading-relaxed text-center mb-1">
                  Watch <span className="text-yellow-400 font-black">{adsRequiredCount} ads</span> to unlock your withdrawal.
                </p>
                <p className="text-white/30 text-[11px] leading-relaxed text-center mb-4">
                  Ads keep this platform free for everyone. Thank you for your support!
                </p>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/35 text-[10px] font-semibold uppercase tracking-wide">Progress</span>
                    <span className="text-yellow-400 text-[10px] font-black tabular-nums">
                      {Math.min(adsWatchedToday, adsRequiredCount)}/{adsRequiredCount}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (adsWatchedToday / adsRequiredCount) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowAdPopup(false)}
                    className="h-10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <button
                    onClick={() => {
                      setShowAdPopup(false);
                      onOpenChange(false);
                      setLocation("/");
                    }}
                    className="h-10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <X className="w-3 h-3" /> Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
