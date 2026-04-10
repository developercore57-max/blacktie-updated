import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { createClientSchema } from "@/lib/schemas";
import { PROVINCES } from "@/lib/utils";
import { useResellerCreateClient, getResellerGetClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";

type FormValues = z.infer<typeof createClientSchema>;

export default function ResellerCreateClient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useResellerCreateClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      sipExtensions: 1,
      monthlyFee: 0,
      province: "",
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getResellerGetClientsQueryKey() });
      toast({ title: "Success", description: "Client added successfully." });
      setLocation("/reseller/clients");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error?.data?.error || "Failed to create client." 
      });
    }
  };

  return (
    <AppLayout role="reseller" title="Add New Client">
      <div className="mb-6">
        <Link href="/reseller/clients" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Clients
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden max-w-4xl">
        <div className="p-6 border-b border-border/50 bg-secondary/20">
          <h2 className="text-xl font-display font-semibold">Client Details</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter the information for your new client. This data helps us provision their VoIP services.</p>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Company Info */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Client Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Name *</label>
                  <input {...form.register("companyName")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                  {form.formState.errors.companyName && <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Primary Contact *</label>
                  <input {...form.register("contactName")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                  {form.formState.errors.contactName && <p className="text-xs text-destructive">{form.formState.errors.contactName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email Address *</label>
                  <input {...form.register("email")} type="email" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                  {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input {...form.register("phone")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t border-border/50">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit / Street Number</label>
                  <input {...form.register("unitStreetNumber")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Unit 4 / 12" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Building / Complex</label>
                  <input {...form.register("buildingComplex")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Sunridge Business Park" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Street Name</label>
                  <input {...form.register("streetName")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Main Road" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Address Line 2 <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input {...form.register("address2")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Industrial area, Estate name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">City</label>
                  <input {...form.register("city")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. Cape Town" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Province</label>
                  <select {...form.register("province")} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none">
                    <option value="">Select Province...</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2 pt-4 border-t border-border/50">
              <label className="text-sm font-medium">Additional Notes</label>
              <textarea {...form.register("notes")} rows={3} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"></textarea>
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex justify-end gap-4">
            <Link href="/reseller/clients" className="px-6 py-2.5 rounded-xl font-medium border border-border hover:bg-secondary transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Client
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
