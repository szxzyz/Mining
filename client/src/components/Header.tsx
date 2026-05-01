import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { AlignJustify, UserRoundPlus, Wallet } from "lucide-react";
import { BsLightningChargeFill } from "react-icons/bs";

interface HeaderProps {
  onMenuOpen?: () => void;
  onInviteOpen?: () => void;
  onWithdrawOpen?: () => void;
}

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ onMenuOpen, onInviteOpen, onWithdrawOpen }, ref) => {
    const { data: user } = useQuery<any>({
      queryKey: ["/api/auth/user"],
      retry: false,
    });

    const satBalance = Math.floor(parseFloat((user as any)?.balance || "0"));

    return (
      <div
        ref={ref}
        className="fixed top-0 left-0 right-0 z-40"
        style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
      >
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

          {/* Left — hamburger button */}
          <button
            onClick={onMenuOpen}
            className="w-10 h-10 rounded-full bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <AlignJustify className="w-4.5 h-4.5 text-white" strokeWidth={2} style={{ width: 18, height: 18 }} />
          </button>

          {/* Center — sparkle + balance pill */}
          <button
            onClick={onWithdrawOpen}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-[#1c1c1e] rounded-full px-4 active:scale-95 transition-transform"
          >
            <BsLightningChargeFill className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F5C542" }} />
            <span className="text-white font-black text-sm tabular-nums">
              {satBalance.toLocaleString()}
            </span>
            <span className="text-white/40 text-xs font-bold uppercase tracking-wide">AXN</span>
          </button>

          {/* Right — two-icon pill */}
          <div className="flex items-center gap-0 bg-[#1c1c1e] rounded-full h-10 overflow-hidden flex-shrink-0">
            <button
              onClick={onInviteOpen}
              className="w-12 h-10 flex items-center justify-center active:bg-white/10 transition-colors"
            >
              <UserRoundPlus className="text-white" strokeWidth={1.8} style={{ width: 18, height: 18 }} />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={onWithdrawOpen}
              className="w-12 h-10 flex items-center justify-center active:bg-white/10 transition-colors"
            >
              <Wallet className="text-white/70" strokeWidth={1.8} style={{ width: 17, height: 17 }} />
            </button>
          </div>

        </div>
      </div>
    );
  }
);

Header.displayName = "Header";

export default Header;
