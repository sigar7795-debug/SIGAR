import { useAuth } from "@/_core/hooks/useAuth";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Bell, BriefcaseBusiness, Building2, GraduationCap, LockKeyhole, Pencil, Phone, Save, Sprout, UserCog, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const roles = [
  { value: "produtor", label: "Produtor", icon: Sprout },
  { value: "gestor", label: "Gestor", icon: BriefcaseBusiness },
  { value: "estudante", label: "Estudante", icon: GraduationCap },
  { value: "consultor", label: "Consultor", icon: UsersRound },
  { value: "administrador", label: "Administrador", icon: UserCog },
] as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("produtor");
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("SIGAR Rural");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [financialAlerts, setFinancialAlerts] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveProfile = trpc.finance.profile.save.useMutation({
    onSuccess: () => {
      void utils.finance.profile.get.invalidate();
      setEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Alterações salvas.");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (profileQuery.data?.profileRole) setRole(profileQuery.data.profileRole);
  }, [profileQuery.data?.profileRole]);

  if (profileQuery.isLoading) return <LoadingState title="A carregar a configuração do perfil" />;
  if (profileQuery.isError) return <QueryErrorState onRetry={() => { void profileQuery.refetch(); }} />;

  const saveChanges = () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não coincide.");
      return;
    }
    saveProfile.mutate({ profileRole: role });
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Conta e preferências"
        title="Meu perfil"
        description="Mantenha os seus dados e preferências de acesso organizados."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(current => !current)}
            className="h-11 rounded-none border-olive/40 bg-transparent text-field hover:bg-accent"
          >
            <Pencil className="mr-2 h-4 w-4" /> {editing ? "Cancelar edição" : "Editar perfil"}
          </Button>
        }
      />

      <section className="grid border-y border-olive/35 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="border-b border-olive/30 bg-field p-6 text-sand lg:border-b-0 lg:border-r sm:p-8">
          <Avatar className="h-24 w-24 border border-sand/25 bg-sand/10">
            <AvatarFallback className="bg-transparent font-display text-4xl font-bold text-sand">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <p className="mt-8 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-sage">Conta autenticada</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-none">{user?.name || "Utilizador"}</h2>
          <p className="mt-3 text-sm text-sand/65">{user?.email || "E-mail não disponível"}</p>
          <div className="mt-8 border-t border-sand/20 pt-5">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-sage">Função atual</p>
            <p className="mt-2 text-sm font-semibold">{roles.find(item => item.value === role)?.label}</p>
          </div>
        </aside>

        <div className="grid gap-5 bg-card p-6 sm:grid-cols-2 sm:p-8">
          <ProfileField label="Nome" value={user?.name || "Utilizador"} disabled />
          <ProfileField label="E-mail" value={user?.email || ""} type="email" disabled />
          <ProfileField label="Telefone" value={phone} onChange={setPhone} disabled={!editing} icon={Phone} placeholder="(00) 00000-0000" />
          <ProfileField label="Organização" value={organization} onChange={setOrganization} disabled={!editing} icon={Building2} />
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="border-t border-olive/35 pt-6">
          <div className="flex items-center gap-3"><BriefcaseBusiness className="h-5 w-5 text-olive" /><div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Função</p><h2 className="mt-1 font-display text-2xl font-bold">Como você usa o SIGAR?</h2></div></div>
          <RadioGroup value={role} onValueChange={value => setRole(value as typeof role)} className="mt-6 grid border-y border-olive/30 sm:grid-cols-2">
            {roles.map(item => {
              const Icon = item.icon;
              const active = item.value === role;
              return (
                <label key={item.value} className={`flex cursor-pointer items-center gap-4 border-b border-r border-olive/25 p-4 transition-colors ${active ? "bg-field text-sand" : "bg-card hover:bg-accent"}`}>
                  <RadioGroupItem value={item.value} className={active ? "border-sand text-sand" : "border-olive text-field"} />
                  <Icon className={`h-4 w-4 ${active ? "text-sage" : "text-olive"}`} />
                  <span className="font-semibold">{item.label}</span>
                </label>
              );
            })}
          </RadioGroup>
        </article>

        <article className="border-t border-olive/35 pt-6">
          <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-olive" /><div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Preferências</p><h2 className="mt-1 font-display text-2xl font-bold">Notificações</h2></div></div>
          <div className="mt-6 divide-y divide-olive/25 border-y border-olive/30">
            <NotificationSetting label="Resumo por e-mail" description="Receba uma leitura periódica dos resultados." checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            <NotificationSetting label="Alertas financeiros" description="Acompanhe vencimentos e movimentos pendentes." checked={financialAlerts} onCheckedChange={setFinancialAlerts} />
          </div>
        </article>
      </section>

      <section className="border-t border-olive/35 pt-6">
        <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-olive" /><div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Segurança</p><h2 className="mt-1 font-display text-2xl font-bold">Alteração de senha</h2></div></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} />
        </div>
      </section>

      <div className="flex justify-end border-t border-olive/35 pt-6">
        <Button
          type="button"
          onClick={saveChanges}
          disabled={saveProfile.isPending}
          className="h-12 rounded-none bg-field px-7 font-semibold text-sand hover:bg-field/90"
        >
          <Save className="mr-2 h-4 w-4" /> {saveProfile.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  icon?: typeof Phone;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">{label}</span>
      <span className="relative block">
        {Icon ? <Icon className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-olive" /> : null}
        <Input
          type={type}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`h-11 rounded-none border-0 border-b border-olive/40 bg-transparent px-0 shadow-none focus-visible:ring-0 ${Icon ? "pl-7" : ""}`}
        />
      </span>
    </label>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">{label}</Label>
      <Input type="password" autoComplete="new-password" value={value} onChange={event => onChange(event.target.value)} className="h-11 rounded-none border-0 border-b border-olive/40 bg-transparent px-0 shadow-none focus-visible:ring-0" />
    </div>
  );
}

function NotificationSetting({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-graphite/55">{description}</p></div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
