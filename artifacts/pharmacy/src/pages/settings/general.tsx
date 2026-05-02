import { useEffect, useState } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import type { UpdateSettingsBody, Settings as SettingsData } from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Save } from "lucide-react";

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<UpdateSettingsBody>({
    pharmacyName: "PharmaCare",
    address: null,
    phone: null,
    email: null,
    ntn: null,
    strn: null,
    drugLicense: null,
    fbrEnabled: false,
    fbrPosId: null,
    fbrToken: null,
    taxPercent: 0,
    receiptFooter: null,
    defaultSaleUnit: "unit",
    batchExpiryRequired: true,
    showPackQtyInReports: false,
    lowStockDays: 30,
    expiryAlertDays: 90,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as SettingsData;
      setForm({
        pharmacyName: s.pharmacyName ?? "PharmaCare",
        address: s.address ?? null,
        phone: s.phone ?? null,
        email: s.email ?? null,
        ntn: s.ntn ?? null,
        strn: s.strn ?? null,
        drugLicense: s.drugLicense ?? null,
        fbrEnabled: s.fbrEnabled ?? false,
        fbrPosId: s.fbrPosId ?? null,
        fbrToken: s.fbrToken ?? null,
        taxPercent: s.taxPercent ?? 0,
        receiptFooter: s.receiptFooter ?? null,
        defaultSaleUnit: s.defaultSaleUnit ?? "unit",
        batchExpiryRequired: s.batchExpiryRequired ?? true,
        showPackQtyInReports: s.showPackQtyInReports ?? false,
        lowStockDays: s.lowStockDays ?? 30,
        expiryAlertDays: s.expiryAlertDays ?? 90,
      });
    }
  }, [settings]);

  const f = (field: keyof UpdateSettingsBody) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value || null }));

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ data: form });
      toast({ title: "Settings saved" });
      qc.invalidateQueries();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">General Settings</h1>
        <p className="text-sm text-muted-foreground">Pharmacy information and system configuration</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Pharmacy Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Pharmacy Name *</Label>
            <Input value={form.pharmacyName ?? ""} onChange={(e) => setForm((p) => ({ ...p, pharmacyName: e.target.value }))} data-testid="input-pharmacy-name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={f("phone")} placeholder="+92 300 0000000" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={f("email")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address ?? ""} onChange={f("address")} placeholder="Full pharmacy address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>NTN (Tax Number)</Label>
              <Input value={form.ntn ?? ""} onChange={f("ntn")} placeholder="e.g. 1234567-8" data-testid="input-ntn" />
            </div>
            <div className="space-y-1">
              <Label>STRN (Sales Tax Reg#)</Label>
              <Input value={form.strn ?? ""} onChange={f("strn")} placeholder="e.g. 17-12-3456-789-12" data-testid="input-strn" />
            </div>
            <div className="space-y-1">
              <Label>Drug License#</Label>
              <Input value={form.drugLicense ?? ""} onChange={f("drugLicense")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Receipt Footer Text</Label>
            <Input value={form.receiptFooter ?? ""} onChange={f("receiptFooter")} placeholder="Thank you for your purchase!" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">FBR POS Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable FBR POS Integration</Label>
              <p className="text-xs text-muted-foreground">Mark sales receipts with FBR POS ID for tax compliance</p>
            </div>
            <Switch
              checked={form.fbrEnabled ?? false}
              onCheckedChange={(v) => setForm((p) => ({ ...p, fbrEnabled: v }))}
              data-testid="switch-fbr-enabled"
            />
          </div>
          {form.fbrEnabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>FBR POS Registration ID</Label>
                <Input
                  value={form.fbrPosId ?? ""}
                  onChange={f("fbrPosId")}
                  placeholder="e.g. POS-FBR-1234567"
                  data-testid="input-fbr-pos-id"
                />
                <p className="text-xs text-muted-foreground">Provided by FBR after POS registration. Printed on each receipt.</p>
              </div>
              <div className="space-y-1">
                <Label>FBR API Bearer Token</Label>
                <Input
                  value={form.fbrToken ?? ""}
                  onChange={f("fbrToken")}
                  placeholder="Bearer token from FIRES/PRAL portal"
                  data-testid="input-fbr-token"
                />
                <p className="text-xs text-muted-foreground">Access token for real-time invoice push to FBR FIRES sandbox API.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Inventory & Sales Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Batch & Expiry on Purchase</Label>
              <p className="text-xs text-muted-foreground">Mandate batch# and expiry date when receiving stock (GRN)</p>
            </div>
            <Switch
              checked={form.batchExpiryRequired ?? true}
              onCheckedChange={(v) => setForm((p) => ({ ...p, batchExpiryRequired: v }))}
              data-testid="switch-batch-required"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Pack Qty in Reports</Label>
              <p className="text-xs text-muted-foreground">Display stock quantities in packs in addition to units</p>
            </div>
            <Switch
              checked={form.showPackQtyInReports ?? false}
              onCheckedChange={(v) => setForm((p) => ({ ...p, showPackQtyInReports: v }))}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Low Stock Alert Days</Label>
              <Input type="number" value={form.lowStockDays ?? 30} onChange={(e) => setForm((p) => ({ ...p, lowStockDays: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground">Days of stock remaining to trigger low stock alert</p>
            </div>
            <div className="space-y-1">
              <Label>Expiry Alert Days</Label>
              <Input type="number" value={form.expiryAlertDays ?? 90} onChange={(e) => setForm((p) => ({ ...p, expiryAlertDays: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground">Alert when medicines expire within this many days</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tax % (GST/PST)</Label>
              <Input type="number" min={0} max={100} value={form.taxPercent ?? 0} onChange={(e) => setForm((p) => ({ ...p, taxPercent: Number(e.target.value) }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-settings">
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
