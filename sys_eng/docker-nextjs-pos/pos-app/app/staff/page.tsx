import Link from "next/link";

import { AblazeMark } from "@/app/components/ablaze-mark";
import { LogoutButton } from "@/app/components/logout-button";
import { requireActiveEmployee } from "@/lib/employee-auth";

const staffActions = [
  {
    href: "/pos",
    title: "Open POS",
    description: "Use the register and staff ordering tools.",
    status: "Ready",
  },
  {
    href: "/staff/kitchen",
    title: "Kitchen Queue",
    description: "View submitted dine-in and takeout orders.",
    status: "Next",
  },
  {
    href: "/staff/orders",
    title: "Orders",
    description: "Manage active orders, payment state, and table help.",
    status: "Planned",
  },
  {
    href: "/staff/waitlist",
    title: "Waitlist",
    description: "Seat guests by party size and table availability.",
    status: "Planned",
  },
  {
    href: "/staff/tables",
    title: "Floor View",
    description: "See table status across the dining room.",
    status: "Planned",
  },
  {
    href: "/customer/account",
    title: "Customer Account",
    description: "Open your personal rewards account from the staff hub.",
    status: "Optional",
  },
];

const ownerActions = [
  {
    href: "/owner/employees",
    title: "Employees",
    description: "Create staff accounts and rotate private login codes.",
    status: "Ready",
  },
  {
    href: "/owner/menu",
    title: "Menu",
    description: "Edit menu items, ingredients, and allergy flags.",
    status: "Ready",
  },
  {
    href: "/owner/settings",
    title: "Restaurant Settings",
    description: "Configure theme, tables, public menu, and tax settings.",
    status: "Planned",
  },
  {
    href: "/owner/payments",
    title: "Payments",
    description: "Connect Stripe, fees, payouts, and reader settings.",
    status: "Planned",
  },
  {
    href: "/owner/loyalty",
    title: "Loyalty",
    description: "Configure points, rewards, and member rules.",
    status: "Planned",
  },
  {
    href: "/owner/audit",
    title: "Audit Log",
    description: "Review sensitive staff actions and request context.",
    status: "New",
  },
  {
    href: "/owner/reports",
    title: "Reports",
    description: "Review sales, takeout vs dine-in, and CSV exports.",
    status: "Planned",
  },
];

export default async function StaffPage() {
  // Staff dashboard is protected by the active employee profile, not by customer auth.
  const employee = await requireActiveEmployee();
  const isOwner = employee.role === "OWNER";

  return (
    <main className="min-h-screen bg-[#100b0b] px-4 py-8 text-[#fff7ed] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <AblazeMark className="h-9 w-9" />
              <span className="text-lg font-semibold">Ablaze</span>
            </Link>
            <p className="mt-5 text-sm uppercase tracking-[0.22em] text-[#ffd166]">
              {isOwner ? "Owner workspace" : "Staff workspace"}
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Welcome, {employee.user.displayUsername ?? employee.user.name}
            </h1>
            <p className="mt-2 max-w-2xl text-zinc-300">
              Jump into daily restaurant tools from one place. Owner-only
              controls appear here as we build them out.
            </p>
          </div>
          <LogoutButton />
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="Staff ID" value={employee.id.toString()} />
          <MetricCard label="Role" value={employee.role} />
          <MetricCard
            label="Hired"
            value={employee.hiredAt.toLocaleDateString()}
          />
        </section>

        <ActionSection
          eyebrow="Daily operations"
          title="Staff tools"
          actions={staffActions}
        />

        {isOwner ? (
          <ActionSection
            eyebrow="Owner controls"
            title="Business setup"
            actions={ownerActions}
          />
        ) : null}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-4 shadow-lg shadow-black/20">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActionSection({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions: typeof staffActions;
}) {
  // Shared section for staff and owner navigation cards.
  return (
    <section className="mt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a1a]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-lg border border-orange-200/10 bg-[#1a0f0b] p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-[#ff6a1a]/70 hover:bg-[#24110b]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{action.title}</h3>
              <span className="rounded border border-[#ffd166]/40 px-2 py-1 text-xs text-[#ffd166]">
                {action.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {action.description}
            </p>
            <p className="mt-4 text-sm font-semibold text-[#ff6a1a] group-hover:text-[#ffd166]">
              Open
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
