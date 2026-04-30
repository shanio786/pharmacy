import { useState } from "react";
import {
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useListCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  useListUnits, useCreateUnit, useUpdateUnit, useDeleteUnit,
  useListRacks, useCreateRack, useUpdateRack, useDeleteRack,
  useListGenericNames, useCreateGenericName, useUpdateGenericName, useDeleteGenericName,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

type MasterItem = { id: number; [key: string]: unknown };

interface MasterTableProps {
  title: string;
  items: MasterItem[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: MasterItem) => void;
  onDelete: (id: number) => void;
  columns?: Array<{ key: string; label: string }>;
}

function MasterTable({ title, items, isLoading, onAdd, onEdit, onDelete, columns = [{ key: "name", label: "Name" }] }: MasterTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} entries</p>
        <Button size="sm" onClick={onAdd} data-testid={`button-add-${title.toLowerCase()}`}>
          <Plus className="w-3 h-3 mr-1" />Add {title}
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-medium text-muted-foreground">{col.label}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-6 text-muted-foreground">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-6 text-muted-foreground">No {title.toLowerCase()} found</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-2.5">{String(item[col.key] ?? "—")}</td>
                    ))}
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(item)} className="text-muted-foreground hover:text-primary p-1">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: Array<{ key: string; label: string; type?: string; placeholder?: string }>;
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
  onSave: () => void;
  isPending: boolean;
}

function MasterEditDialog({ open, onOpenChange, title, fields, form, setForm, onSave, isPending }: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form._id ? `Edit ${title}` : `Add ${title}`}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label>{field.label}</Label>
              <Input
                type={field.type ?? "text"}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                data-testid={`input-${title.toLowerCase()}-${field.key}`}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isPending} data-testid={`button-save-${title.toLowerCase()}`}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {form._id ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AnyHook = () => { mutateAsync: (args: Record<string, unknown>) => Promise<unknown>; isPending: boolean };

function useMasterCRUD(
  createHook: AnyHook,
  updateHook: AnyHook,
  deleteHook: AnyHook,
  fields: string[]
) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const createMutation = createHook();
  const updateMutation = updateHook();
  const deleteMutation = deleteHook();

  const openAdd = () => { setForm(Object.fromEntries(fields.map((f) => [f, ""]))); setShowDialog(true); };
  const openEdit = (item: MasterItem) => {
    setForm({ _id: String(item.id), ...Object.fromEntries(fields.map((f) => [f, String(item[f] ?? "")])) });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = Object.fromEntries(fields.map((f) => [f, form[f] || null]));
    try {
      if (form._id) {
        await updateMutation.mutateAsync({ id: Number(form._id), data });
        toast({ title: "Updated successfully" });
      } else {
        await createMutation.mutateAsync({ data });
        toast({ title: "Created successfully" });
      }
      setShowDialog(false);
      qc.invalidateQueries();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Deleted" });
      qc.invalidateQueries();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };

  return { showDialog, setShowDialog, form, setForm, openAdd, openEdit, handleSave, handleDelete, isPending: createMutation.isPending || updateMutation.isPending };
}

export default function MastersPage() {
  const { data: categories = [], isLoading: loadingCat } = useListCategories();
  const catCRUD = useMasterCRUD(useCreateCategory, useUpdateCategory, useDeleteCategory, ["name", "description"]);

  const { data: companies = [], isLoading: loadingComp } = useListCompanies();
  const compCRUD = useMasterCRUD(useCreateCompany, useUpdateCompany, useDeleteCompany, ["name", "country", "phone"]);

  const { data: units = [], isLoading: loadingUnits } = useListUnits();
  const unitCRUD = useMasterCRUD(useCreateUnit, useUpdateUnit, useDeleteUnit, ["name", "abbreviation"]);

  const { data: racks = [], isLoading: loadingRacks } = useListRacks();
  const rackCRUD = useMasterCRUD(useCreateRack, useUpdateRack, useDeleteRack, ["name", "description"]);

  const { data: generics = [], isLoading: loadingGen } = useListGenericNames();
  const genCRUD = useMasterCRUD(useCreateGenericName, useUpdateGenericName, useDeleteGenericName, ["name", "description"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Master Data</h1>
        <p className="text-sm text-muted-foreground">Manage categories, companies, units, racks and generic names</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="racks">Racks</TabsTrigger>
          <TabsTrigger value="generics">Generic Names</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <MasterTable
            title="Category"
            items={(categories as unknown as MasterItem[]) ?? []}
            isLoading={loadingCat}
            onAdd={catCRUD.openAdd}
            onEdit={catCRUD.openEdit}
            onDelete={catCRUD.handleDelete}
            columns={[{ key: "name", label: "Name" }, { key: "description", label: "Description" }]}
          />
          <MasterEditDialog open={catCRUD.showDialog} onOpenChange={catCRUD.setShowDialog} title="Category" fields={[{ key: "name", label: "Name *" }, { key: "description", label: "Description" }]} form={catCRUD.form} setForm={catCRUD.setForm} onSave={catCRUD.handleSave} isPending={catCRUD.isPending} />
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <MasterTable
            title="Company"
            items={(companies as unknown as MasterItem[]) ?? []}
            isLoading={loadingComp}
            onAdd={compCRUD.openAdd}
            onEdit={compCRUD.openEdit}
            onDelete={compCRUD.handleDelete}
            columns={[{ key: "name", label: "Name" }, { key: "country", label: "Country" }, { key: "phone", label: "Phone" }]}
          />
          <MasterEditDialog open={compCRUD.showDialog} onOpenChange={compCRUD.setShowDialog} title="Company" fields={[{ key: "name", label: "Name *" }, { key: "country", label: "Country" }, { key: "phone", label: "Phone" }]} form={compCRUD.form} setForm={compCRUD.setForm} onSave={compCRUD.handleSave} isPending={compCRUD.isPending} />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <MasterTable
            title="Unit"
            items={(units as unknown as MasterItem[]) ?? []}
            isLoading={loadingUnits}
            onAdd={unitCRUD.openAdd}
            onEdit={unitCRUD.openEdit}
            onDelete={unitCRUD.handleDelete}
            columns={[{ key: "name", label: "Name" }, { key: "abbreviation", label: "Abbreviation" }]}
          />
          <MasterEditDialog open={unitCRUD.showDialog} onOpenChange={unitCRUD.setShowDialog} title="Unit" fields={[{ key: "name", label: "Name *" }, { key: "abbreviation", label: "Abbreviation" }]} form={unitCRUD.form} setForm={unitCRUD.setForm} onSave={unitCRUD.handleSave} isPending={unitCRUD.isPending} />
        </TabsContent>

        <TabsContent value="racks" className="mt-4">
          <MasterTable
            title="Rack"
            items={(racks as unknown as MasterItem[]) ?? []}
            isLoading={loadingRacks}
            onAdd={rackCRUD.openAdd}
            onEdit={rackCRUD.openEdit}
            onDelete={rackCRUD.handleDelete}
            columns={[{ key: "name", label: "Rack Name" }, { key: "description", label: "Location/Description" }]}
          />
          <MasterEditDialog open={rackCRUD.showDialog} onOpenChange={rackCRUD.setShowDialog} title="Rack" fields={[{ key: "name", label: "Rack Name *" }, { key: "description", label: "Location / Description" }]} form={rackCRUD.form} setForm={rackCRUD.setForm} onSave={rackCRUD.handleSave} isPending={rackCRUD.isPending} />
        </TabsContent>

        <TabsContent value="generics" className="mt-4">
          <MasterTable
            title="Generic Name"
            items={(generics as unknown as MasterItem[]) ?? []}
            isLoading={loadingGen}
            onAdd={genCRUD.openAdd}
            onEdit={genCRUD.openEdit}
            onDelete={genCRUD.handleDelete}
            columns={[{ key: "name", label: "Generic Name" }, { key: "description", label: "Description" }]}
          />
          <MasterEditDialog open={genCRUD.showDialog} onOpenChange={genCRUD.setShowDialog} title="Generic Name" fields={[{ key: "name", label: "Generic Name *" }, { key: "description", label: "Description" }]} form={genCRUD.form} setForm={genCRUD.setForm} onSave={genCRUD.handleSave} isPending={genCRUD.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
