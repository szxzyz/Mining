import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Loader2, ArrowLeft, X, HelpCircle, Droplets,
} from "lucide-react";
import { RiShareForwardFill, RiUserFollowFill, RiLinkM, RiGroupFill, RiCoinFill } from "react-icons/ri";
import { FaCopy } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";

interface ReferralItem {
  refereeId: string;
  name: string;
  username?: string;
  totalSatsEarned: number;
  referralStatus: string;
  channelMember: boolean;
  isActive: boolean;
}

interface WellData {
  wellBalance: number;
  totalEarned: number;
  totalFriends: number;
  totalWithdrawalCommission: number;
}

interface InvitePopupProps {
  onClose: () => void;
}

export default function InvitePopup({ onClose }: InvitePopupProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000,
  });

  const { data: referralData, isLoading: referralsLoading } = useQuery<{ referrals: ReferralItem[] }>({
    queryKey: ["/api/referrals/list"],
    retry: false,
    staleTime: 60000,
  });

  const { data: wellData } = useQuery<WellData>({
    queryKey: ["/api/referrals/well"],
    retry: false,
    staleTime: 30000,
  });

  const claimWellMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referrals/well/claim", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: (data) => {
      showNotification(`+${data.amount?.toFixed(2) || 0} AXN claimed from Well!`, "success");
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/well"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => showNotification(e.message || "Nothing to claim", "error"),
  });

  const { data: botInfo } = useQuery<{ username: string }>({
    queryKey: ["/api/bot-info"],
    staleTime: 60 * 60 * 1000,
  });
  const botUsername = botInfo?.username || "bot";
  const referralLink = user?.referralCode
    ? `https://t.me/${botUsername}?start=${user.referralCode}`
    : "";

  const referrals = referralData?.referrals || [];
  const wellBalance = wellData?.wellBalance ?? 0;
  const totalFriends = wellData?.totalFriends ?? referrals.length;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showNotification("Link copied!", "success");
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tgWebApp = (window as any).Telegram?.WebApp;
      const shareTitle = "⛏️ Mine AXN with me on CashWatch! Use my invite link:";
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareTitle)}`;
      if (tgWebApp?.openTelegramLink) {
        tgWebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank");
      }
    } catch {}
    setIsSharing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex flex-col"
        style={{ background: '#000000' }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center justify-between"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 20px)' }}
        >
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-white font-black text-sm uppercase tracking-tight">Invite Friends</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* ─── YOUR WELL ─── */}
          <div
            className="rounded-3xl p-5 flex flex-col items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0f1f10, #0a1a0a)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <Droplets className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Your Well</p>
              <p className="text-white font-black text-4xl tabular-nums leading-none">
                {wellBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-green-400/70 text-sm font-bold mt-1">AXN</p>
              {(wellData?.totalEarned ?? 0) > 0 && (
                <p className="text-white/25 text-xs mt-2">
                  Total earned: {(wellData?.totalEarned ?? 0).toFixed(2)} AXN
                </p>
              )}
            </div>

            {/* Claim button */}
            <button
              onClick={() => claimWellMutation.mutate()}
              disabled={claimWellMutation.isPending || wellBalance <= 0}
              className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
              style={wellBalance > 0 ? {
                background: "linear-gradient(135deg, #22c55e, #15803d)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(34,197,94,0.25)",
              } : {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {claimWellMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</>
              ) : wellBalance > 0 ? (
                <><RiCoinFill className="w-4 h-4" /> Claim {wellBalance.toFixed(2)} AXN</>
              ) : (
                "Well is empty"
              )}
            </button>

            {/* How does it work button */}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-1.5 text-white/30 text-xs active:text-white/50 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How does it work?
            </button>
          </div>

          {/* ─── Stats Row ─── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-2xl tabular-nums">{totalFriends}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide mt-1">Friends Invited</p>
            </div>
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-2xl tabular-nums">10%</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wide mt-1">Commission Rate</p>
            </div>
          </div>

          {/* ─── Invite Link ─── */}
          <div>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5">Your Invite Link</p>
            <div className="bg-[#1a1a1a]/50 border border-[#2a2a2a] rounded-2xl px-4 py-3 text-xs text-white/50 font-mono mb-3 break-all">
              {referralLink || "Loading..."}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={copyLink}
                disabled={!referralLink}
                className="h-11 flex items-center justify-center gap-2 bg-white/[0.07] border border-white/5 text-white rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <FaCopy className="w-3.5 h-3.5 text-white/50" />
                Copy Link
              </button>
              <button
                onClick={shareLink}
                disabled={!referralLink || isSharing}
                className="h-11 flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: "#F5C542", color: "#000" }}
              >
                {isSharing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RiShareForwardFill className="w-4 h-4" />
                )}
                {isSharing ? "Sharing..." : "Share"}
              </button>
            </div>
          </div>

          {/* ─── Friends List ─── */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <RiGroupFill className="w-3.5 h-3.5 text-white/20" />
                Your Friends ({referrals.length})
              </p>
            </div>

            {referralsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-10">
                <RiGroupFill className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-white/30 text-sm font-bold">No friends invited yet</p>
                <p className="text-white/20 text-xs mt-1">Share your link to start filling your Well!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl px-4 py-3.5 border ${r.isActive ? "bg-green-500/5 border-green-500/15" : "bg-[#1a1a1a]/50 border-[#2a2a2a]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-bold truncate">{r.name}</span>
                          {r.isActive ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400/60 flex-shrink-0" />
                          )}
                        </div>
                        {r.username && (
                          <p className="text-white/30 text-[10px] mt-0.5">@{r.username}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.isActive ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"
                        }`}>
                          {r.isActive ? "Active" : r.referralStatus === "pending" ? "Pending" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Close */}
        <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full h-12 bg-[#1a1a1a]/50 border border-[#2a2a2a] rounded-2xl font-black uppercase tracking-wider text-white text-sm transition-all active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* ─── How It Works Modal ─── */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHowItWorks(false)} />
            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: "#0a0a0a", border: "1px solid #1c1c1e" }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
                <p className="text-white font-black text-sm uppercase tracking-wider">How the Well Works</p>
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="h-7 w-7 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/40 active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-5 space-y-3">
                {[
                  { icon: <RiLinkM className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F5C542" }} />, title: "Invite friends", desc: "Share your unique invite link. Friends join via your link." },
                  { icon: <RiShareForwardFill className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#22c55e" }} />, title: "They mine & withdraw", desc: "Every time a friend withdraws AXN, 10% of their amount flows into your Well automatically." },
                  { icon: <RiUserFollowFill className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#60a5fa" }} />, title: "Machine level-up bonus", desc: "Earn 50 AXN each time a verified friend upgrades their mining machine." },
                  { icon: <Droplets className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />, title: "Claim your Well", desc: "When your Well has AXN, claim it anytime to add it to your main balance." },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1c1c1e] rounded-2xl p-3.5 flex items-start gap-3">
                    {item.icon}
                    <div>
                      <p className="text-white text-xs font-bold">{item.title}</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white/50 transition-transform active:scale-[0.97]"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
