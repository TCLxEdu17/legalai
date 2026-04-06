"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface GlowingShadowProps {
  children: ReactNode
  fullWidth?: boolean
  className?: string
}

export function GlowingShadow({ children, fullWidth = false, className }: GlowingShadowProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-[2px]",
        "bg-gradient-to-br from-blue-500/40 via-violet-500/30 to-blue-600/40",
        fullWidth ? "w-full" : "w-fit mx-auto",
        className,
      )}
      style={{ isolation: "isolate" }}
    >
      {/* Glow estático no fundo */}
      <div
        className="absolute inset-0 rounded-2xl opacity-60 blur-xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.4) 0%, rgba(59,130,246,0.3) 50%, transparent 80%)",
        }}
      />
      {/* Card */}
      <div
        className={cn(
          "relative rounded-[calc(1rem-2px)] bg-[#0d1117] z-10",
          fullWidth ? "w-full p-10 md:p-14" : "p-8",
        )}
      >
        {children}
      </div>
    </div>
  )
}
