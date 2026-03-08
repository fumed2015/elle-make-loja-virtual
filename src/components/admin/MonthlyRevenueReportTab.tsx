import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, Save } from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const VALID_STATUSES = ["approved", "confirmed", "processing", "shipped", "delivered"];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MonthlyRevenueReportTab() {
  const now = new Date();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [year, setYear] = useState(now.getFullYear());

  // MEI settings persistence
  const { data: meiSettings } = useQuery({
    queryKey: ["mei-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mei_settings")
        .maybeSingle();
      return (data?.value as any) || {};
    },
  });

  const [cnpj, setCnpj] = useState("");
  const [entrepreneur, setEntrepreneur] = useState("");
  const [localDate, setLocalDate] = useState("");

  useEffect(() => {
    if (meiSettings) {
      if (meiSettings.cnpj) setCnpj(meiSettings.cnpj);
      if (meiSettings.entrepreneur) setEntrepreneur(meiSettings.entrepreneur);
    }
  }, [meiSettings]);

  // Editable row values
  const [itemI, setItemI] = useState(0);
  const [itemII, setItemII] = useState(0);
  const [itemIV, setItemIV] = useState(0);
  const [itemV, setItemV] = useState(0);
  const [itemVII, setItemVII] = useState(0);
  const [itemVIII, setItemVIII] = useState(0);

  // Fetch orders for selected month
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: monthlyTotal, isLoading } = useQuery({
    queryKey: ["revenue-report-orders", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, status")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .in("status", VALID_STATUSES);
      if (error) throw error;
      return (data || []).reduce((sum, o) => sum + Number(o.total), 0);
    },
  });

  // Auto-fill item I with monthly total whenever data changes
  useEffect(() => {
    if (monthlyTotal !== undefined) {
      setItemI(monthlyTotal);
      setItemII(0);
    }
  }, [monthlyTotal]);

  const itemIII = itemI + itemII;
  const itemVI = itemIV + itemV;
  const itemIX = itemVII + itemVIII;
  const itemX = itemIII + itemVI + itemIX;

  const saveMeiSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "mei_settings", value: { cnpj, entrepreneur } as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mei-settings"] });
      toast.success("Dados do MEI salvos!");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = `${MONTHS[month]} / ${year}`;

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Controls - hidden on print */}
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <Label className="text-xs">Mês</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Ano</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => saveMeiSettings.mutate()} className="gap-1.5">
          <Save className="w-3.5 h-3.5" /> Salvar Dados MEI
        </Button>
        <Button size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Exportar PDF
        </Button>
      </div>

      {/* Report Document */}
      <div
        ref={printRef}
        className="bg-white text-black border border-border rounded-lg p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none"
        id="revenue-report"
      >
        <h1 className="text-center text-lg font-bold uppercase tracking-wide mb-6">
          Relatório Mensal das Receitas Brutas
        </h1>

        {/* Header fields */}
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex gap-2 items-center">
            <span className="font-semibold min-w-[180px]">CNPJ:</span>
            <input
              className="flex-1 border-b border-gray-400 bg-transparent outline-none px-1 py-0.5 text-sm print:border-b print:border-gray-600"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-semibold min-w-[180px]">Empreendedor Individual:</span>
            <input
              className="flex-1 border-b border-gray-400 bg-transparent outline-none px-1 py-0.5 text-sm print:border-b print:border-gray-600"
              value={entrepreneur}
              onChange={(e) => setEntrepreneur(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-semibold min-w-[180px]">Período de Apuração:</span>
            <span className="text-sm">{periodLabel}</span>
          </div>
        </div>

        {/* Section 1 - Comércio */}
        <ReportSection
          title="RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)"
          rows={[
            {
              label: "I – Revenda de mercadorias com dispensa de emissão de documento fiscal",
              value: itemI,
              onChange: setItemI,
            },
            {
              label: "II – Revenda de mercadorias com documento fiscal emitido",
              value: itemII,
              onChange: setItemII,
            },
            {
              label: "III – Total das receitas com revenda de mercadorias (I + II)",
              value: itemIII,
              isTotal: true,
            },
          ]}
        />

        {/* Section 2 - Indústria */}
        <ReportSection
          title="RECEITA BRUTA MENSAL – VENDA DE PRODUTOS INDUSTRIALIZADOS (INDÚSTRIA)"
          rows={[
            {
              label: "IV – Venda de produtos industrializados com dispensa de emissão de documento fiscal",
              value: itemIV,
              onChange: setItemIV,
            },
            {
              label: "V – Venda de produtos industrializados com documento fiscal emitido",
              value: itemV,
              onChange: setItemV,
            },
            {
              label: "VI – Total das receitas com venda de produtos industrializados (IV + V)",
              value: itemVI,
              isTotal: true,
            },
          ]}
        />

        {/* Section 3 - Serviços */}
        <ReportSection
          title="RECEITA BRUTA MENSAL – PRESTAÇÃO DE SERVIÇOS"
          rows={[
            {
              label: "VII – Receita com prestação de serviços com dispensa de emissão de documento fiscal",
              value: itemVII,
              onChange: setItemVII,
            },
            {
              label: "VIII – Receita com prestação de serviços com documento fiscal emitido",
              value: itemVIII,
              onChange: setItemVIII,
            },
            {
              label: "IX – Total das receitas com prestação de serviços (VII + VIII)",
              value: itemIX,
              isTotal: true,
            },
          ]}
        />

        {/* Total Geral */}
        <div className="border-2 border-black mt-6 p-3 flex justify-between items-center">
          <span className="font-bold text-sm">X – Total geral das receitas brutas no mês (III + VI + IX)</span>
          <span className="font-bold text-base">R$ {fmt(itemX)}</span>
        </div>

        {/* Local e Data + Assinatura */}
        <div className="mt-10 space-y-8 text-sm">
          <div className="flex gap-2 items-center">
            <span className="font-semibold min-w-[120px]">LOCAL E DATA:</span>
            <input
              className="flex-1 border-b border-gray-400 bg-transparent outline-none px-1 py-0.5 text-sm print:border-b print:border-gray-600"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              placeholder="Cidade, DD de Mês de AAAA"
            />
          </div>
          <div>
            <span className="font-semibold">ASSINATURA DO EMPRESÁRIO:</span>
            <div className="border-b border-gray-400 mt-8 w-80 print:border-gray-600" />
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-10 text-xs text-gray-600 space-y-1.5 border-t border-gray-300 pt-4">
          <p className="font-semibold uppercase">Encontram-se anexados a este relatório:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Os documentos fiscais comprobatórios das entradas de mercadorias e serviços tomados referentes ao período;</li>
            <li>As notas fiscais relativas às operações ou prestações realizadas eventualmente emitidas.</li>
          </ul>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #revenue-report, #revenue-report * { visibility: visible; }
          #revenue-report { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  );
}

interface RowData {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  isTotal?: boolean;
}

function ReportSection({ title, rows }: { title: string; rows: RowData[] }) {
  return (
    <div className="mt-5">
      <h2 className="text-xs font-bold uppercase bg-gray-100 px-3 py-2 border border-gray-300 print:bg-gray-100">
        {title}
      </h2>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border border-gray-300 ${row.isTotal ? "bg-gray-50 font-semibold" : ""}`}>
              <td className="px-3 py-2 text-xs leading-tight">{row.label}</td>
              <td className="px-3 py-2 text-right w-36 whitespace-nowrap">
                {row.onChange ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 text-right border-b border-gray-400 bg-transparent outline-none text-xs py-0.5 print:border-gray-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={row.value || ""}
                      onChange={(e) => row.onChange!(Number(e.target.value) || 0)}
                    />
                  </div>
                ) : (
                  <span className="text-xs">R$ {fmt(row.value)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
