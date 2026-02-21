import { useState, useCallback } from "react";

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

export interface CorreiosResult {
  name: string;
  price: number;
  days: string;
}

async function fetchCorreios(cep: string): Promise<CorreiosResult[]> {
  // Use ViaCEP to validate + publicly available estimate
  const clean = sanitizeCep(cep);
  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!res.ok) throw new Error("CEP não encontrado");
  const data = await res.json();
  if (data.erro) throw new Error("CEP não encontrado");

  // Simulated Correios pricing based on region
  const state = (data.uf || "").toUpperCase();
  const isNorth = ["PA", "AM", "AP", "AC", "RO", "RR", "TO"].includes(state);
  const isNortheast = ["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"].includes(state);

  const options: CorreiosResult[] = [];

  if (isNorth) {
    options.push(
      { name: "PAC", price: 18.9, days: "5 a 8 dias úteis" },
      { name: "SEDEX", price: 32.9, days: "2 a 4 dias úteis" }
    );
  } else if (isNortheast) {
    options.push(
      { name: "PAC", price: 24.9, days: "7 a 12 dias úteis" },
      { name: "SEDEX", price: 42.9, days: "3 a 5 dias úteis" }
    );
  } else {
    options.push(
      { name: "PAC", price: 29.9, days: "10 a 15 dias úteis" },
      { name: "SEDEX", price: 54.9, days: "4 a 7 dias úteis" }
    );
  }

  return options;
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
  const [state, setState] = useState<ShippingState>({
    cep: "",
    loading: false,
    error: null,
    options: [],
    selectedOption: null,
    isLocal: false,
    addressInfo: null,
  });

  const setCep = useCallback((value: string) => {
    setState((s) => ({ ...s, cep: formatCep(value), error: null, options: [], selectedOption: null }));
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
            price: 20,
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
        const correios = await fetchCorreios(clean);
        const options: ShippingOption[] = correios.map((c) => ({
          id: c.name.toLowerCase(),
          name: `📦 ${c.name}`,
          description: `Correios • ${c.days}`,
          price: c.price,
          estimatedDays: c.days,
        }));
        setState((s) => ({ ...s, loading: false, options, isLocal: false, addressInfo, selectedOption: options[0]?.id || null }));
      }
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message || "Erro ao calcular frete" }));
    }
  }, [state.cep]);

  const selectedShipping = state.options.find((o) => o.id === state.selectedOption) || null;

  return {
    ...state,
    setCep,
    selectOption,
    calculateShipping,
    selectedShipping,
  };
};
