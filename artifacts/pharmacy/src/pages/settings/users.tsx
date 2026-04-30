import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import type { CreateUserBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

const ROLES = ["admin", "pharmacist", "cashier"];

interface UserForm {
  username: string;
  password?: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<UserForm>({ username: "", password: "", fullName: "", role: "pharmacist", isActive: true });

  const { data: users = [], isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const openCreate = () => { setEditItem(null); setForm({ username: "", password: "", fullName: "", role: "pharmacist", isActive: true }); setShowDialog(true); };
  const openEdit = (u: any) => {
    setEditItem(u);
    setForm({ username: u.username, password: "", fullName: u.fullName, role: u.role, isActive: u.isActive });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.fullName) { toast({ title: "Username and full name are required", variant: "destructive" }); return; }
    if (!editItem && !form.password) { toast({ title: "Password is required for new users", variant: "destructive" }); return; }
    try {
      const body = { ...form, password: form.password || undefined };
      if (editItem) {
        await updateUser.mutateAsync({ id: editItem.id, data: body });
        toast({ title: "User updated" });
      } else {
        await createUser.mutateAsync({ data: body as CreateUserBody });
        toast({ title: "User created" });
      }
      setShowDialog(false);
      qc.invalidateQueries();
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteUser.mutateAsync({ id });
      toast({ title: "User deleted" });
      qc.invalidateQueries();
    } catch (err: any) { toast({ title: "Error", description: err?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts and roles</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Full Name</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : (users as any[]).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users found</td></tr>
                ) : (
                  (users as any[]).map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-sm">{u.username}</td>
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.isActive ? "default" : "destructive"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} className="text-muted-foreground hover:text-primary p-1" data-testid={`button-edit-user-${u.id}`}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="text-muted-foreground hover:text-destructive p-1" data-testid={`button-delete-user-${u.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Username *</Label><Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} disabled={!!editItem} data-testid="input-username" /></div>
            <div className="space-y-1"><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} data-testid="input-fullname" /></div>
            <div className="space-y-1">
              <Label>{editItem ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={form.password ?? ""} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createUser.isPending || updateUser.isPending} data-testid="button-save-user">
              {(createUser.isPending || updateUser.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
