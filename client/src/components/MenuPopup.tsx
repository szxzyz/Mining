import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wifi, CalendarDays, Receipt, Zap,
  ChevronRight, ArrowLeft, CheckCircle, XCircle, Clock, Loader2,
  TrendingUp, Activity, RefreshCw, Star, FileText, Lock, Info, Shield,
} from "lucide-react";
import { RiBarChartFill } from "react-icons/ri";
import { FaReceipt, FaBalanceScale, FaCrown } from "react-icons/fa";
import { MdAddTask, MdLanguage, MdOutlineSupportAgent, MdPeople } from "react-icons/md";
import { BsShieldFill, BsQuestionCircleFill, BsBookFill } from "react-icons/bs";
import { format } from "date-fns";
import { useAdmin } from "@/hooks/useAdmin";
import { useLocation } from "wouter";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/useLanguage";
import { showNotification } from "@/components/AppNotification";
import { Check } from "lucide-react";

interface MenuPopupProps {
  onClose: () => void;
  onOpenInvite?: () => void;
}

type Overlay = "transactions" | "stats" | "legal" | "faq" | "tutorial" | "language" | null;

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function fmtAge(days: number): string {
  if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  return `${days}d`;
}

export default function MenuPopup({ onClose, onOpenInvite }: MenuPopupProps) {
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const { language, setLanguage } = useLanguage();
  const [overlay, setOverlay] = useState<Overlay>(null);

  const { data: txData, isLoading: txLoading } = useQuery<any>({
    queryKey: ["/api/withdrawals"],
    enabled: overlay === "transactions",
    retry: false,
  });

  const { data: projectStats } = useQuery<{
    totalUsers: number;
    onlineNow: number;
    totalWithdrawalsAmount: number;
    totalWithdrawalsCount: number;
    projectAgeDays: number;
    totalEarnings: number;
    todayEarnings: number;
    dau: number;
    wau: number;
    totalReferrals: number;
    uptimePct: number;
    retentionRate: number;
  }>({
    queryKey: ["/api/project/stats"],
    enabled: overlay === "stats",
    retry: false,
    staleTime: 30000,
  });

  const withdrawals = txData?.withdrawals || [];
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: any) => {
    setLanguage(code);
    const label = SUPPORTED_LANGUAGES.find(l => l.code === code)?.label || code;
    showNotification(`Language changed to ${label}`, 'success');
    setOverlay(null);
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid"))
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s?.includes("reject") || s?.includes("failed"))
      return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid")) return "text-green-400";
    if (s?.includes("reject") || s?.includes("failed")) return "text-red-400";
    return "text-yellow-400";
  };

  const slideProps = {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring" as const, damping: 28, stiffness: 260 },
  };

  return (
    <>
      {/* ── Main Menu (full-screen slide-right) ── */}
      <AnimatePresence>
        {overlay === null && (
          <motion.div
            className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col"
            {...slideProps}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center justify-center"
              style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 20px)' }}
            >
              <h2 className="text-white font-black text-base uppercase tracking-tight italic">Menu</h2>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              <MenuItem
                icon={<RiBarChartFill className="w-5 h-5" style={{ color: "#60a5fa" }} />}
                label="Project Statistics"
                onClick={() => setOverlay("stats")}
              />
              <MenuItem
                icon={<MdLanguage className="w-5 h-5" style={{ color: "#c084fc" }} />}
                label="Language"
                right={<span className="text-white/50 text-sm mr-1">{currentLang.flag}</span>}
                onClick={() => setOverlay("language")}
              />
              <MenuItem
                icon={<MdPeople className="w-5 h-5" style={{ color: "#4ade80" }} />}
                label="Refer Friend"
                onClick={() => { onClose(); onOpenInvite?.(); }}
              />
              <MenuItem
                icon={<FaReceipt className="w-5 h-5" style={{ color: "#facc15" }} />}
                label="Transactions"
                onClick={() => setOverlay("transactions")}
              />
              <MenuItem
                icon={<BsQuestionCircleFill className="w-5 h-5" style={{ color: "#38bdf8" }} />}
                label="FAQs"
                onClick={() => setOverlay("faq")}
              />
              <MenuItem
                icon={<BsBookFill className="w-5 h-5" style={{ color: "#fb923c" }} />}
                label="Tutorial"
                onClick={() => setOverlay("tutorial")}
              />
              <MenuItem
                icon={<MdOutlineSupportAgent className="w-5 h-5" style={{ color: "#f472b6" }} />}
                label="Customer Support"
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/LightningSatoshi');
                  else window.open('https://t.me/LightningSatoshi', '_blank');
                }}
              />
              <MenuItem
                icon={<FaBalanceScale className="w-5 h-5" style={{ color: "#a5b4fc" }} />}
                label="Privacy Policy"
                onClick={() => setOverlay("legal")}
              />

              {isAdmin && (
                <>
                  <div className="pt-3 pb-1 px-1">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Admin</p>
                  </div>
                  <MenuItem
                    icon={<FaCrown className="w-5 h-5" style={{ color: "#fbbf24" }} />}
                    label="Admin Panel"
                    onClick={() => { onClose(); setLocation("/admin"); }}
                  />
                  <MenuItem
                    icon={<MdAddTask className="w-5 h-5" style={{ color: "#F5C542" }} />}
                    label="Create Task"
                    onClick={() => { onClose(); setLocation("/task/create"); }}
                  />
                </>
              )}
            </div>

            {/* Bottom Back Button */}
            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full h-12 bg-[#1a1a1a]/50 border border-[#2a2a2a] rounded-2xl font-black uppercase tracking-wider text-white text-sm hover:bg-white/5 transition-all active:scale-[0.98]"
              >
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Language Picker ── */}
      <AnimatePresence>
        {overlay === "language" && (
          <motion.div
            className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col"
            {...slideProps}
          >
            <OverlayHeader title="Select Language" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto py-1.5" data-no-translate>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-5 py-4 transition-all active:bg-white/5 ${
                    language === lang.code ? 'bg-[#F5C542]/8' : 'hover:bg-white/4'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl leading-none">{lang.flag}</span>
                    <p className={`text-sm font-bold ${language === lang.code ? 'text-[#F5C542]' : 'text-white'}`}>{lang.label}</p>
                  </div>
                  {language === lang.code && <Check className="w-4 h-4 text-[#F5C542]" />}
                </button>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={() => setOverlay(null)}
                className="w-full h-12 bg-[#1a1a1a]/50 border border-[#2a2a2a] rounded-2xl font-black uppercase tracking-wider text-white text-sm active:scale-[0.98]"
              >
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Project Statistics ── */}
      <AnimatePresence>
        {overlay === "stats" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideProps}>
            <OverlayHeader title="Project Statistics" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!projectStats ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <Section label="Core">
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Users className="w-4 h-4 text-blue-400" />} label="Total Users" value={fmtNum(projectStats.totalUsers)} />
                      <StatCard icon={<Wifi className="w-4 h-4 text-green-400" />} label="Online Now" value={fmtNum(projectStats.onlineNow)} live />
                      <StatCard icon={<CalendarDays className="w-4 h-4 text-purple-400" />} label="Project Age" value={fmtAge(projectStats.projectAgeDays)} />
                      <StatCard icon={<TrendingUp className="w-4 h-4 text-[#F5C542]" />} label="Earnings" value={`${fmtNum(projectStats.totalEarnings)} AXN`} />
                      <StatCard icon={<Receipt className="w-4 h-4 text-cyan-400" />} label="Withdrawals" value={`${fmtNum(projectStats.totalWithdrawalsAmount)} AXN`} wide />
                    </div>
                  </Section>
                  <Section label="Advanced">
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Zap className="w-4 h-4 text-orange-400" />} label="Today Earnings" value={`${fmtNum(projectStats.todayEarnings)} AXN`} wide />
                      <StatCard icon={<Activity className="w-4 h-4 text-blue-300" />} label="Daily Active" value={fmtNum(projectStats.dau)} />
                      <StatCard icon={<Activity className="w-4 h-4 text-indigo-400" />} label="Weekly Active" value={fmtNum(projectStats.wau)} />
                    </div>
                  </Section>
                  <Section label="Pro">
                    <div className="grid grid-cols-2 gap-2.5">
                      <StatCard icon={<Users className="w-4 h-4 text-teal-400" />} label="Total Referrals" value={fmtNum(projectStats.totalReferrals)} />
                      <StatCard icon={<RefreshCw className="w-4 h-4 text-green-400" />} label="Uptime" value={`${projectStats.uptimePct}%`} />
                      <StatCard icon={<Star className="w-4 h-4 text-[#F5C542]" />} label="Retention Rate" value={`${projectStats.retentionRate}%`} wide />
                    </div>
                  </Section>
                </div>
              )}
            </div>
            <BackFooter onBack={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transactions ── */}
      <AnimatePresence>
        {overlay === "transactions" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideProps}>
            <OverlayHeader title="Transactions" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {txLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              ) : withdrawals.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white/20" strokeWidth={1.5} />
                  </div>
                  <p className="text-white/25 text-xs font-bold uppercase tracking-widest">No transactions yet</p>
                </div>
              ) : (
                withdrawals.map((w: any) => (
                  <div key={w.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(w.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-black uppercase tracking-tight">{w.method || "Withdrawal"}</p>
                      <p className="text-white/35 text-[10px] mt-0.5">{w.createdAt ? format(new Date(w.createdAt), "dd MMM yyyy") : "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white text-sm font-black tabular-nums">{parseFloat(w.amount || "0").toLocaleString()} AXN</p>
                      <p className={`text-[10px] font-bold capitalize mt-0.5 ${getStatusColor(w.status)}`}>{w.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <BackFooter onBack={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legal / Privacy Policy ── */}
      <AnimatePresence>
        {overlay === "legal" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideProps}>
            <OverlayHeader title="Privacy Policy" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <LegalBlock icon={<FileText className="w-4 h-4 text-orange-400" />} title="Terms of Use">
                <p>By accessing or using this app, you agree to be bound by these Terms. All rewards are denominated in AXN. Reward rates and withdrawal minimums are subject to change at any time.</p>
                <p>Any attempt to manipulate rewards, exploit bugs, or bypass restrictions will result in immediate account suspension.</p>
              </LegalBlock>
              <LegalBlock icon={<Lock className="w-4 h-4 text-purple-400" />} title="Privacy Policy">
                <p>We collect only the minimum data necessary: your Telegram user ID, username, and first name. This is used solely for account identification and reward delivery.</p>
                <p>We do not sell or share your personal data. All data is stored securely. You may request account deletion at any time by contacting support.</p>
              </LegalBlock>
              <LegalBlock icon={<Shield className="w-4 h-4 text-blue-400" />} title="User Conduct">
                <p>Each user is permitted one account only. Multiple accounts will be detected and banned. Self-referrals are strictly prohibited. Users must be 18+ to participate.</p>
              </LegalBlock>
              <LegalBlock icon={<Info className="w-4 h-4 text-red-400" />} title="Disclaimer">
                <p>This application is independent and is not affiliated with Telegram Messenger Inc. Earnings are not guaranteed and may vary. This app does not constitute financial advice.</p>
              </LegalBlock>
            </div>
            <BackFooter onBack={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAQs ── */}
      <AnimatePresence>
        {overlay === "faq" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideProps}>
            <OverlayHeader title="FAQs" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {[
                { q: "How do I earn AXN?", a: "Earn AXN by mining with your machine, watching ads, completing tasks, daily check-ins, and inviting friends." },
                { q: "What is the Mining Machine?", a: "Your personal AXN generator. Start the CPU to mine AXN, claim when capacity fills, and keep antivirus ON to prevent attacks." },
                { q: "How long does antivirus last?", a: "Antivirus stays active for 25 minutes after activation, then auto-disables. You need to reactivate it manually." },
                { q: "How does the referral system work?", a: "Share your referral link. When someone joins, you earn AXN. You also earn bonus AXN every time your referrals level up their machine." },
                { q: "When can I withdraw?", a: "Once you reach the minimum withdrawal amount. Tap Withdraw in the bottom bar to check eligibility." },
                { q: "Why was my account banned?", a: "Accounts are banned for violating terms: multiple accounts, self-referrals, or exploiting bugs. Contact support if you believe this is a mistake." },
              ].map((faq, i) => (
                <div key={i} className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                  <p className="text-white font-bold text-xs mb-2">{faq.q}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
            <BackFooter onBack={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tutorial ── */}
      <AnimatePresence>
        {overlay === "tutorial" && (
          <motion.div className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col" {...slideProps}>
            <OverlayHeader title="Tutorial" onBack={() => setOverlay(null)} />
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {[
                { step: "1", title: "Set Up Your Machine", desc: "Start the CPU to begin mining AXN. Your machine mines automatically while running.", icon: "⛏️" },
                { step: "2", title: "Activate Antivirus", desc: "Turn on antivirus to protect your machine from attacks. It lasts 25 minutes per activation.", icon: "🛡️" },
                { step: "3", title: "Claim Your Mining", desc: "When capacity fills, tap Claim AXN to add mined tokens to your balance.", icon: "💰" },
                { step: "4", title: "Complete Tasks", desc: "Watch ads and complete daily tasks to earn additional AXN on top of your mining income.", icon: "✅" },
                { step: "5", title: "Invite Friends", desc: "Share your referral link. Earn AXN bonuses when friends join and level up their machine.", icon: "👥" },
                { step: "6", title: "Upgrade Machine", desc: "Use AXN to upgrade mining speed, capacity, and CPU duration for higher earnings.", icon: "⚡" },
              ].map((t) => (
                <div key={t.step} className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5C542]/10 flex items-center justify-center text-xl flex-shrink-0">
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs mb-1">Step {t.step}: {t.title}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <BackFooter onBack={() => setOverlay(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ──

function MenuItem({ icon, label, onClick, right }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl active:bg-white/5 transition-all"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {right}
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </button>
  );
}

function OverlayHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="px-5 py-4 border-b border-white/5 flex-shrink-0 flex items-center justify-center"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 20px)' }}
    >
      <h2 className="text-white font-black text-base uppercase tracking-tight italic">{title}</h2>
    </div>
  );
}

function BackFooter({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
      <button
        onClick={onBack}
        className="w-full h-12 bg-[#1a1a1a]/50 border border-[#2a2a2a] rounded-2xl font-black uppercase tracking-wider text-white text-sm hover:bg-white/5 transition-all active:scale-[0.98]"
      >
        Back
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2.5 px-1">{label}</p>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, live, wide }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  live?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-2xl p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        {live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      </div>
      <p className="text-white font-black text-base tabular-nums leading-none">{value}</p>
      <p className="text-white/30 text-[10px] uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function LegalBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-2xl p-4">
      <p className="text-white font-black text-sm mb-3 flex items-center gap-2">{icon} {title}</p>
      <div className="space-y-2 text-white/50 text-xs leading-relaxed">{children}</div>
    </div>
  );
}
