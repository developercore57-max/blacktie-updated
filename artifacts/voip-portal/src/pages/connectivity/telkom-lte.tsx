import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SignalHigh, AlertTriangle, Loader2, MapPin, CheckCircle2, XCircle, HelpCircle, ExternalLink } from "lucide-react";

function TelkomLteContent({ role }: { role: "admin" | "reseller" }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [popup, setPopup] = useState<{ address: string; status: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/google-maps-key", { credentials: "include" })
      .then(r => r.ok ? r.json() : { key: null })
      .then(data => setApiKey(data.key || null))
      .catch(() => setApiKey(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "coverage-result" && e.data.coverageType === "telkom-lte") {
        setPopup({ address: e.data.address, status: e.data.status });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const mapSrc = apiKey
    ? `${import.meta.env.BASE_URL}telkom-map.html?key=${encodeURIComponent(apiKey)}`
    : null;

  const coveragePath = role === "admin" ? "/admin/coverage/requests" : "/reseller/coverage/requests";

  return (
    <AppLayout role={role} title="Telkom LTE Coverage Check">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-3 bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <SignalHigh className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">Telkom LTE Coverage Map</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter an address below to check Telkom LTE availability in that area.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading coverage map…</p>
            </div>
          ) : !mapSrc ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="font-semibold text-foreground">Google Maps API key not configured</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                An admin must configure the Google Maps API key in Company Settings → API Keys to enable the Telkom LTE coverage map.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <iframe
                src={mapSrc}
                className="w-full border-0 rounded-xl"
                style={{ height: "560px" }}
                title="Telkom LTE Coverage Map"
                allow="geolocation"
                referrerPolicy="origin"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Coverage Result Popup ── */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPopup(null)}>
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              {popup.status === "available" ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
              ) : popup.status === "not_available" ? (
                <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-red-500" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                  <HelpCircle className="w-9 h-9 text-amber-500" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-center mb-1">
              {popup.status === "available"
                ? "Coverage Available"
                : popup.status === "not_available"
                ? "Coverage Not Available"
                : "Coverage Status"}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {popup.status === "available"
                ? "Telkom LTE coverage is available at this location."
                : popup.status === "not_available"
                ? "Telkom LTE coverage is currently not available at this location."
                : "Verify Telkom LTE coverage on the map above or submit a formal request."}
            </p>

            <div className="bg-muted/30 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 border border-border/40">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground leading-snug">{popup.address}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPopup(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    prefill_address: popup.address,
                    service: "lte",
                    autoopen: "1",
                  });
                  setPopup(null);
                  setLocation(`${coveragePath}?${params.toString()}`);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Request Coverage Check
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export function AdminTelkomLte() {
  return <TelkomLteContent role="admin" />;
}

export function ResellerTelkomLte() {
  return <TelkomLteContent role="reseller" />;
}
