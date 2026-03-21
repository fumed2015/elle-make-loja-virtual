import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number | null; // null = "a combinar"
  estimatedDays: string;
}

// CEP ranges for Belém and Ananindeua (PA)
const BELEM_RANGES = [
  { min: 66000000, max: 66999999 }, // Belém
];
const ANANINDEUA_RANGES = [
  { min: 67000000, max: 67199999 }, // Ananindeua
];

function sanitizeCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

function isBelemOrAnanindeua(cep: string): boolean {
  const num = parseInt(sanitizeCep(cep), 10);
  if (isNaN(num)) return false;
  return (
    BELEM_RANGES.some((r) => num >= r.min && num <= r.max) ||
    ANANINDEUA_RANGES.some((r) => num >= r.min && num <= r.max)
  );
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export interface MelhorEnvioResult {
  id: string;
  name: string;
  company: string;
  price: number;
  days: number;
}

async function fetchMelhorEnvio(cep: string): Promise<MelhorEnvioResult[]> {
  const clean = sanitizeCep(cep);

  const { data, error } = await supabase.functions.invoke("melhor-envio-shipping", {
    body: { cep_destino: clean },
  });

  if (error) {
    console.error("Melhor Envio edge function error:", error);
    throw new Error("Erro ao consultar frete. Tente novamente.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return (data?.options || []) as MelhorEnvioResult[];
}

const STORAGE_KEY = "ellemake_shipping_cep";

function getSavedCep(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveCep(cep: string) {
  try {
    localStorage.setItem(STORAGE_KEY, cep);
  } catch {}
}

export interface ShippingState {
  cep: string;
  loading: boolean;
  error: string | null;
  options: ShippingOption[];
  selectedOption: string | null;
  isLocal: boolean;
  addressInfo: { city?: string; state?: string; neighborhood?: string } | null;
}

export const useShipping = () => {
  const [localFee, setLocalFee] = useState<number>(15);

  useEffect(() => {
    supabase.from("financial_premises").select("local_shipping_fee").limit(1).single()
      .then(({ data }) => {
        if (data?.local_shipping_fee != null) setLocalFee(Number(data.local_shipping_fee));
      });
  }, []);

  const [state, setState] = useState<ShippingState>({
    cep: formatCep(getSavedCep()),
    loading: false,
    error: null,
    options: [],
    selectedOption: null,
    isLocal: false,
    addressInfo: null,
  });

  const setCep = useCallback((value: string) => {
    const formatted = formatCep(value);
    setState((s) => ({ ...s, cep: formatted, error: null, options: [], selectedOption: null }));
    const clean = sanitizeCep(formatted);
    if (clean.length === 8) saveCep(clean);
  }, []);

  const selectOption = useCallback((id: string) => {
    setState((s) => ({ ...s, selectedOption: id }));
  }, []);

  const calculateShipping = useCallback(async () => {
    const clean = sanitizeCep(state.cep);
    if (clean.length !== 8) {
      setState((s) => ({ ...s, error: "Digite um CEP válido com 8 dígitos" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null, options: [], selectedOption: null }));

    try {
      // Validate CEP with ViaCEP
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error("CEP não encontrado");
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado. Verifique e tente novamente.");

      const addressInfo = { city: data.localidade, state: data.uf, neighborhood: data.bairro };
      const local = isBelemOrAnanindeua(clean);

      if (local) {
        const options: ShippingOption[] = [
          {
            id: "express",
            name: "🛵 Entrega Expressa",
            description: "Motoboy em até 3 horas • Belém e Ananindeua",
            price: localFee,
            estimatedDays: "Até 3 horas",
          },
          {
            id: "uberflash",
            name: "⚡ Uberflash",
            description: "Entrega via Uber Flash • Preço a combinar",
            price: null,
            estimatedDays: "Mesmo dia",
          },
        ];
        setState((s) => ({ ...s, loading: false, options, isLocal: true, addressInfo, selectedOption: "express" }));
      } else {
        const results = await fetchMelhorEnvio(clean);
        const options: ShippingOption[] = results.map((r) => ({
          id: r.id,
          name: `📦 ${r.company} - ${r.name}`,
          description: `${r.days} dia(s) útil(eis)`,
          price: r.price,
          estimatedDays: `${r.days} dia(s) útil(eis)`,
        }));
        setState((s) => ({ ...s, loading: false, options, isLocal: false, addressInfo, selectedOption: options[0]?.id || null }));
      }
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message || "Erro ao calcular frete" }));
    }
  }, [state.cep, localFee]);

  const selectedShipping = state.options.find((o) => o.id === state.selectedOption) || null;

  return {
    ...state,
    setCep,
    selectOption,
    calculateShipping,
    selectedShipping,
  };
};
