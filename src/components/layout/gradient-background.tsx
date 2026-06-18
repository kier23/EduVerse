import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Cpu,
  Network,
  Shield,
  Server,
  Wifi,
  Database,
  Terminal,
  Lock,
} from "lucide-react";

// Decorative circuit node dot
function CircuitNode({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute h-2 w-2 rounded-full border border-amber-600/60 bg-amber-600/30",
        className,
      )}
    />
  );
}

// Floating IT icon badge
function FloatingIcon({
  icon: Icon,
  className,
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute flex h-9 w-9 items-center justify-center rounded-lg border border-amber-700/25 bg-stone-800/60 text-amber-600/55 backdrop-blur-sm",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.5} />
    </div>
  );
}

export function GradientBackground({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden bg-[#1a1008]",
        className,
      )}
    >
      {/* Base radial glow — warm mocha bloom at top */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(180,110,40,0.18),transparent)]" />

      {/* Secondary warm glow from bottom-left */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_100%,rgba(120,60,10,0.14),transparent)]" />

      {/* Subtle grid overlay — circuit board feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(180,120,50,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,120,50,1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Circuit trace lines */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-left traces */}
        <svg
          className="absolute left-0 top-0 h-72 w-80 opacity-20"
          viewBox="0 0 320 288"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 60 H80 V120 H160 V80 H240"
            stroke="rgb(180,110,40)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M0 140 H60 V100 H140"
            stroke="rgb(180,110,40)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M40 0 V80 H100 V160"
            stroke="rgb(210,150,80)"
            strokeWidth="0.75"
            strokeDasharray="3 8"
          />
          <circle cx="80" cy="60" r="3" fill="rgb(180,110,40)" opacity="0.6" />
          <circle cx="160" cy="80" r="3" fill="rgb(180,110,40)" opacity="0.6" />
          <circle cx="60" cy="100" r="2" fill="rgb(210,150,80)" opacity="0.5" />
          <circle cx="100" cy="80" r="2" fill="rgb(210,150,80)" opacity="0.5" />
        </svg>

        {/* Bottom-right traces */}
        <svg
          className="absolute bottom-0 right-0 h-72 w-80 opacity-20"
          viewBox="0 0 320 288"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M320 180 H240 V220 H160 V200 H80"
            stroke="rgb(180,110,40)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M320 240 H260 V200 H180"
            stroke="rgb(180,110,40)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M280 288 V200 H220 V120"
            stroke="rgb(210,150,80)"
            strokeWidth="0.75"
            strokeDasharray="3 8"
          />
          <circle
            cx="240"
            cy="220"
            r="3"
            fill="rgb(180,110,40)"
            opacity="0.6"
          />
          <circle
            cx="160"
            cy="200"
            r="3"
            fill="rgb(180,110,40)"
            opacity="0.6"
          />
          <circle
            cx="260"
            cy="200"
            r="2"
            fill="rgb(210,150,80)"
            opacity="0.5"
          />
          <circle
            cx="220"
            cy="200"
            r="2"
            fill="rgb(210,150,80)"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-amber-900/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-orange-950/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-800/15 blur-3xl" />

      {/* Floating IT icons — scattered decoratively */}
      <FloatingIcon icon={Cpu} className="left-[6%]   top-[12%]" />
      <FloatingIcon icon={Network} className="right-[8%]  top-[18%]" />
      <FloatingIcon icon={Shield} className="left-[12%]  bottom-[20%]" />
      <FloatingIcon icon={Server} className="right-[5%]  bottom-[28%]" />
      <FloatingIcon icon={Wifi} className="left-[2%]   top-[52%]" />
      <FloatingIcon icon={Database} className="right-[14%] top-[58%]" />
      <FloatingIcon icon={Terminal} className="left-[18%]  top-[30%]" />
      <FloatingIcon icon={Lock} className="right-[20%] bottom-[12%]" />

      {/* Small circuit node accents */}
      <CircuitNode className="left-[22%]  top-[8%]" />
      <CircuitNode className="right-[30%] top-[22%]" />
      <CircuitNode className="left-[40%]  bottom-[14%]" />
      <CircuitNode className="right-[40%] bottom-[35%]" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
