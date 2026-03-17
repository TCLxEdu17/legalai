"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles } from "@/components/ui/sparkles";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";

const plans = [
  {
    id: "basic",
    name: "Basic",
    description: "Ideal para advogados autônomos que querem começar a usar IA no escritório",
    price: 97,
    yearlyPrice: 970,
    buttonText: "Fazer upgrade",
    buttonVariant: "outline" as const,
    popular: false,
    includes: [
      "Incluso no Basic:",
      "200 mensagens de chat/mês",
      "20 uploads de documentos/mês",
      "500 chamadas de API",
      "Busca semântica em jurisprudências",
      "Análise de documentos com IA",
      "Exportação de peças jurídicas",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Melhor custo-benefício para escritórios que precisam de mais poder e acesso a processos privados",
    price: 297,
    yearlyPrice: 2970,
    buttonText: "Fazer upgrade",
    buttonVariant: "default" as const,
    popular: true,
    proFeature: {
      icon: ShieldCheck,
      label: "Processos Privados",
      description: "Consulte processos restritos via credenciais OAB",
    },
    includes: [
      "Tudo do Basic, mais:",
      "2.000 mensagens de chat/mês",
      "200 uploads de documentos/mês",
      "5.000 chamadas de API",
      "Suporte prioritário",
      "Processos Privados via OAB (e-SAJ TJSP)",
      "Monitoramento automático de processos",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    description: "Plano avançado com acesso irrestrito e SLA dedicado para grandes equipes",
    price: 697,
    yearlyPrice: 6970,
    buttonText: "Fazer upgrade",
    buttonVariant: "outline" as const,
    popular: false,
    includes: [
      "Tudo do Pro, mais:",
      "Mensagens ilimitadas",
      "Uploads ilimitados",
      "API ilimitada",
      "SLA dedicado",
      "Onboarding personalizado",
      "Acesso a todas as integrações futuras",
    ],
  },
];

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-neutral-900 border border-gray-700 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors",
            selected === "0" ? "text-white" : "text-gray-400"
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border-4 shadow-sm shadow-brand-600 border-brand-600 bg-gradient-to-t from-brand-500 to-brand-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Mensal</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors",
            selected === "1" ? "text-white" : "text-gray-400"
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border-4 shadow-sm shadow-brand-600 border-brand-600 bg-gradient-to-t from-brand-500 to-brand-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Anual
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
              -17%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

interface PricingSectionProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string) => void;
  loadingPlan?: string | null;
}

export default function PricingSection({ currentPlan, onSelectPlan, loadingPlan }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const togglePricingPeriod = (value: string) => setIsYearly(Number.parseInt(value) === 1);

  return (
    <div className="min-h-screen mx-auto relative bg-black overflow-x-hidden" ref={pricingRef}>
      {/* Background sparkles */}
      <div className="absolute top-0 h-96 w-screen overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px]" />
        <Sparkles
          density={1200}
          direction="bottom"
          speed={1}
          color="#FFFFFF"
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
        />
      </div>

      {/* Glow azul */}
      <div className="absolute left-0 top-[-114px] w-full h-[113.625vh] flex flex-col items-start pointer-events-none overflow-hidden z-0">
        <div className="relative w-full h-full">
          <div
            className="absolute left-[-568px] right-[-568px] top-0 h-[2053px] flex-none rounded-full"
            style={{ border: "200px solid #3131f5", filter: "blur(92px)" }}
          />
        </div>
      </div>

      {/* Header */}
      <article className="text-center mb-6 pt-32 max-w-3xl mx-auto space-y-4 relative z-50 px-4">
        <h2 className="text-4xl font-medium text-white">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.12}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-center"
            transition={{ type: "spring", stiffness: 250, damping: 40, delay: 0 }}
          >
            Planos para cada fase do seu escritório
          </VerticalCutReveal>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-gray-400"
        >
          IA jurídica com busca semântica, análise de documentos e processos privados via OAB.
          Escolha o plano ideal para o seu volume de trabalho.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          <PricingSwitch onSwitch={togglePricingPeriod} />
        </motion.div>
      </article>

      {/* Radial glow center */}
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, #1e3a8a 0%, transparent 70%)",
          opacity: 0.5,
          mixBlendMode: "multiply",
        }}
      />

      {/* Cards */}
      <div className="grid md:grid-cols-3 max-w-5xl gap-4 py-6 mx-auto px-4 relative z-10">
        {plans.map((plan, index) => {
          const isCurrent = currentPlan === plan.id;
          const ProIcon = plan.proFeature?.icon;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.5 }}
            >
              <Card
                className={cn(
                  "relative text-white h-full",
                  plan.popular
                    ? "bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-900 border-brand-500/40 shadow-[0px_-8px_180px_0px_rgba(79,70,229,0.4)] z-20"
                    : "bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-neutral-800 z-10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-brand-600 text-white px-3 py-1 rounded-full font-bold tracking-wide z-30 whitespace-nowrap">
                    RECOMENDADO
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-bold tracking-wide z-30 whitespace-nowrap">
                    SEU PLANO
                  </div>
                )}

                <CardHeader className="text-left pb-4">
                  <h3 className="text-2xl font-semibold mb-1">{plan.name}</h3>

                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-400">R$</span>
                    <NumberFlow
                      value={isYearly ? plan.yearlyPrice : plan.price}
                      className="text-4xl font-bold"
                      format={{ maximumFractionDigits: 0 }}
                    />
                    <span className="text-gray-400 text-sm ml-0.5">/{isYearly ? "ano" : "mês"}</span>
                  </div>

                  {isYearly && (
                    <p className="text-emerald-400 text-xs font-medium">
                      Equivale a R$ {Math.round(plan.yearlyPrice / 12)}/mês — 2 meses grátis
                    </p>
                  )}

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{plan.description}</p>

                  {/* Badge PRO Feature */}
                  {plan.proFeature && ProIcon && (
                    <div className="flex items-start gap-2 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <ProIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-400">{plan.proFeature.label}</p>
                        <p className="text-xs text-gray-400">{plan.proFeature.description}</p>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full mb-6 p-3.5 text-sm rounded-xl bg-white/5 text-gray-400 border border-white/10 cursor-default"
                    >
                      Plano atual
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectPlan?.(plan.id)}
                      disabled={!!loadingPlan}
                      className={cn(
                        "w-full mb-6 p-3.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50",
                        plan.popular
                          ? "bg-gradient-to-t from-brand-600 to-brand-500 shadow-lg shadow-brand-900/50 border border-brand-400/30 text-white hover:brightness-110"
                          : "bg-gradient-to-t from-neutral-950 to-neutral-700 shadow-lg shadow-neutral-900 border border-neutral-700 text-white hover:brightness-110"
                      )}
                    >
                      {loadingPlan === plan.id ? "Aguarde..." : plan.buttonText}
                    </button>
                  )}

                  <div className="space-y-2.5 pt-4 border-t border-neutral-800">
                    <h4 className="text-xs font-semibold text-gray-300 mb-3">{plan.includes[0]}</h4>
                    <ul className="space-y-2">
                      {plan.includes.slice(1).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Trial note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="text-center text-xs text-gray-600 pb-16 relative z-10"
      >
        Pagamentos processados com segurança via Stripe · Cancele quando quiser
      </motion.p>
    </div>
  );
}
