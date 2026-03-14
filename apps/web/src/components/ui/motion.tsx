'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// ─── Fade In ────────────────────────────────────────────────────────────────

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  className,
  ...props
}: { children: ReactNode; delay?: number; duration?: number; className?: string } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ─── Scroll Reveal ──────────────────────────────────────────────────────────

export function ScrollReveal({
  children,
  delay = 0,
  className,
}: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Interactive Card ───────────────────────────────────────────────────────

export function InteractiveCard({
  children,
  className,
  onClick,
}: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Container ─────────────────────────────────────────────────────

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
}: { children: ReactNode; className?: string; staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Parallax ───────────────────────────────────────────────────────────────

export function Parallax({
  children,
  offset = 30,
  className,
}: { children: ReactNode; offset?: number; className?: string }) {
  return (
    <motion.div
      initial={{ y: offset }}
      whileInView={{ y: 0 }}
      viewport={{ once: false, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Pulse (microinteraction) ───────────────────────────────────────────────

export function PulseOnMount({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Number Counter ─────────────────────────────────────────────────────────

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {value.toLocaleString('pt-BR')}
    </motion.span>
  );
}
