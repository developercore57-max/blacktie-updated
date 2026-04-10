import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useResellerGetAreaCodes, AreaCodeWithCount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { MapPin, PhoneCall, Hash, ChevronRight, Loader2, ChevronDown } from "lucide-react";

const SA_AREA_CODES = [
  "010","012","013","014","015","016","017","018",
  "021","022","023","027","028",
  "031","032","033","034","035","036","039",
  "041","042","043","044","045","046","047","048","049",
  "051","053","054","056","057","058",
  "086","087",
];

export default function ResellerRequestDid() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: areaCodes = [], isLoading } = useResellerGetAreaCodes();

  const [selectedAreaCodeId, setSelectedAreaCodeId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  const orderedAreaCodes = SA_AREA_CODES
    .map((code) => areaCodes.find((ac: AreaCodeWithCount) => ac.code === code))
    .filter(Boolean) as AreaCodeWithCount[];

  const selectedAc = orderedAreaCodes.find((ac) => ac.id === selectedAreaCodeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaCodeId || quantity < 1) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reseller/dids/request-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCodeId: selectedAreaCodeId, quantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Request Failed", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "DIDs Claimed!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/reseller/dids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reseller/area-codes"] });
      setLocation("/reseller/dids");
    } catch {
      toast({ title: "Request Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout role="reseller" title="Request New DID">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <PhoneCall className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Request New DID Numbers</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Select an area code and the quantity of numbers you need.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Area Code Dropdown */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Area Code
              </label>

              {isLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border border-border rounded-xl text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading area codes…
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAreaCodeId}
                    onChange={(e) => setSelectedAreaCodeId(e.target.value ? Number(e.target.value) : "")}
                    required
                    className="w-full appearance-none px-4 py-3 pr-10 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select an area code…</option>
                    {orderedAreaCodes.map((ac) => (
                      <option key={ac.id} value={ac.id}>
                        {ac.code} — {ac.region}{ac.province ? ` (${ac.province})` : ""}
                        {ac.availableCount > 0 ? ` · ${ac.availableCount} available` : " · contact admin"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              )}

              {/* Selected preview */}
              {selectedAc && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{selectedAc.code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedAc.region}</p>
                    <p className="text-xs text-muted-foreground">{selectedAc.province}</p>
                  </div>
                  <div className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedAc.availableCount > 0
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {selectedAc.availableCount > 0 ? `${selectedAc.availableCount} available` : "Request from admin"}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Hash className="w-4 h-4 text-primary" />
                Quantity
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                required
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">Maximum 50 DIDs per request.</p>
            </div>

            {/* Summary */}
            {selectedAc && quantity > 0 && (
              <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">You are requesting</span>
                <span className="font-bold text-foreground">
                  {quantity} × {selectedAc.code} number{quantity !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!selectedAreaCodeId || quantity < 1 || submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> Request DIDs</>
              )}
            </button>
          </form>
        </div>

      </div>
    </AppLayout>
  );
}
