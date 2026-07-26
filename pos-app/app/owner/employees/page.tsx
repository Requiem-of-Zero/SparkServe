import Link from "next/link";

import {
  bootstrapOwnerAction,
  createEmployeeAction,
  deactivateEmployeeAction,
  reactivateEmployeeAction,
  rotateAllEmployeeCodesAction,
  rotateSelectedEmployeeCodesAction,
} from "@/app/owner/employees/actions";
import { LogoutButton } from "@/app/components/logout-button";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { getCurrentEmployee } from "@/lib/employee-auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type EmployeeWithUser = Prisma.EmployeeProfileGetPayload<{
  include: { user: true };
}>;

type EmployeePageProps = {
  searchParams?: Promise<{
    created?: string;
    role?: string;
    rotated?: string;
    status?: string;
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  // The first owner is bootstrapped before normal owner-only protections exist.
  const [ownerProfile, currentEmployee, restaurant] = await Promise.all([
    prisma.employeeProfile.findFirst({ where: { role: "OWNER" } }),
    getCurrentEmployee(),
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
  ]);
  const ownerExists = Boolean(ownerProfile);
  const restaurantName = restaurant?.name ?? "Restaurant";

  if (!ownerExists) {
    return (
      <BootstrapOwnerScreen
        createdCode={params?.created}
        logoUrl={restaurant?.logoUrl}
        restaurantName={restaurantName}
      />
    );
  }

  if (
    !currentEmployee ||
    !currentEmployee.active ||
    currentEmployee.resignedAt ||
    currentEmployee.role !== "OWNER"
  ) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <section className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold">Owner login required</h1>
          <p className="mt-2 text-zinc-400">
            Sign in with an owner employee code to manage staff accounts.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Go to staff login
          </Link>
        </section>
      </main>
    );
  }

  const employees = await prisma.employeeProfile.findMany({
    orderBy: [{ role: "desc" }, { hiredAt: "desc" }],
    include: { user: true },
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <Link href="/staff" className="text-sm text-zinc-400 hover:text-white">
              Back to staff dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Employees</h1>
            <p className="mt-2 text-zinc-400">
              Create owner-distributed staff codes and manage POS roles.
            </p>
          </div>
          <LogoutButton />
        </div>

        {params?.created ? (
          <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950 p-4">
            <p className="text-sm text-emerald-200">
              Created {params.role ?? "employee"} code
            </p>
            <p className="mt-1 text-3xl font-bold tracking-widest">
              {params.created}
            </p>
          </div>
        ) : null}

        {params?.rotated ? (
          <div className="mt-6 rounded-lg border border-amber-800 bg-amber-950 p-4">
            <p className="text-sm text-amber-200">
              Refreshed {params.rotated} employee code
              {params.rotated === "1" ? "" : "s"}.
            </p>
          </div>
        ) : null}

        {params?.status ? <EmployeeStatusMessage status={params.status} /> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <EmployeeForm />
          <EmployeeTable currentEmployeeId={currentEmployee.id} employees={employees} />
        </div>
      </section>
    </main>
  );
}

function BootstrapOwnerScreen({
  createdCode,
  logoUrl,
  restaurantName,
}: {
  createdCode?: string;
  logoUrl?: string | null;
  restaurantName: string;
}) {
  // First-run setup screen for a fresh restaurant database.
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
        <RestaurantBrandLink
          logoUrl={logoUrl}
          name={restaurantName}
          markClassName="h-9 w-9"
        />
        <h1 className="text-3xl font-bold">Create the owner account</h1>
        <p className="mt-2 text-zinc-400">
          This only appears before the first owner exists in the restaurant database.
        </p>

        {createdCode ? (
          <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950 p-4">
            <p className="text-sm text-emerald-200">
              Owner employee code for POS/register use
            </p>
            <p className="mt-1 text-3xl font-bold tracking-widest">
              {createdCode}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Continue to staff login
            </Link>
          </div>
        ) : null}

        <form action={bootstrapOwnerAction} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="firstName" label="Owner first name" required />
            <TextInput name="lastName" label="Owner last name" required />
          </div>
          <TextInput
            name="displayName"
            label="Owner display name"
            placeholder="Shown inside the POS"
          />
          <TextInput name="email" label="Owner email" type="email" required />
          <TextInput
            name="password"
            label="Owner password"
            type="password"
            required
          />
          <TextInput
            name="confirmPassword"
            label="Retype owner password"
            type="password"
            required
          />
          <button className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400">
            Create owner
          </button>
        </form>
      </section>
    </main>
  );
}

function EmployeeForm() {
  // Creates staff login credentials plus the employee profile/role record.
  return (
    <form
      action={createEmployeeAction}
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
    >
      <h2 className="text-xl font-semibold">New employee</h2>
      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput name="firstName" label="First name" required />
          <TextInput name="lastName" label="Last name" required />
        </div>
        <TextInput
          name="displayName"
          label="Display name"
          placeholder="Shown inside the POS"
        />
        <TextInput name="email" label="Email" type="email" required />
        <TextInput name="password" label="Temporary password" type="password" required />
        <TextInput
          name="confirmPassword"
          label="Retype temporary password"
          type="password"
          required
        />
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Role</span>
          <select
            name="role"
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
            defaultValue="CASHIER"
          >
            <option value="CASHIER">Cashier</option>
            <option value="MANAGER">Manager</option>
          </select>
        </label>
      </div>
      <button className="mt-5 w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400">
        Create employee
      </button>
    </form>
  );
}

function EmployeeTable({
  currentEmployeeId,
  employees,
}: {
  currentEmployeeId: number;
  employees: EmployeeWithUser[];
}) {
  // Owners can see private codes here because this is where they distribute them.
  // Deactivation preserves audit/order history while preventing future login.
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <h2 className="font-semibold">Existing employees</h2>
          <p className="text-sm text-zinc-500">
            Select staff when a private login code needs to be rotated.
          </p>
        </div>
        <form action={rotateAllEmployeeCodesAction}>
          <button className="rounded-md border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950">
            Refresh all codes
          </button>
        </form>
      </div>

      <form action={rotateSelectedEmployeeCodesAction}>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Select</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Hired</th>
                <th className="px-4 py-3">Access</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <input
                      name="employeeIds"
                      type="checkbox"
                      value={employee.id}
                      className="h-4 w-4 accent-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {employee.loginCode ?? "Needs code"}
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="truncate font-medium">
                      {getEmployeeDisplayName(employee)}
                    </div>
                    <div className="truncate text-zinc-400">
                      {employee.firstName || employee.lastName
                        ? employee.user.displayUsername ?? employee.user.name
                        : employee.user.name}
                    </div>
                    <div className="truncate text-zinc-500">{employee.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{employee.role}</td>
                  <td className="px-4 py-3">
                    {employee.active && !employee.resignedAt ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3">
                    {employee.hiredAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {employee.active && !employee.resignedAt ? (
                      <button
                        formAction={deactivateEmployeeAction.bind(null, employee.id)}
                        disabled={employee.id === currentEmployeeId}
                        className="rounded-md border border-red-800 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        formAction={reactivateEmployeeAction.bind(null, employee.id)}
                        className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-950"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-800 px-4 py-3">
          <button className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400">
            Refresh selected codes
          </button>
        </div>
      </form>
    </div>
  );
}

function getEmployeeDisplayName(employee: EmployeeWithUser) {
  const structuredName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ");

  return structuredName || employee.user.displayUsername || employee.user.name;
}

function EmployeeStatusMessage({ status }: { status: string }) {
  const messages: Record<string, { tone: "good" | "warn"; message: string }> = {
    deactivated: {
      tone: "warn",
      message: "Employee access was deactivated.",
    },
    reactivated: {
      tone: "good",
      message: "Employee access was reactivated.",
    },
    "self-deactivate-blocked": {
      tone: "warn",
      message: "You cannot deactivate your own owner account.",
    },
    "last-owner-blocked": {
      tone: "warn",
      message: "At least one active owner must remain.",
    },
    missing: {
      tone: "warn",
      message: "That employee profile could not be found.",
    },
  };
  const statusMessage = messages[status];

  if (!statusMessage) {
    return null;
  }

  const className =
    statusMessage.tone === "good"
      ? "border-emerald-800 bg-emerald-950 text-emerald-200"
      : "border-amber-800 bg-amber-950 text-amber-200";

  return (
    <div className={`mt-6 rounded-lg border p-4 ${className}`}>
      <p className="text-sm">{statusMessage.message}</p>
    </div>
  );
}

function TextInput({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
      />
    </label>
  );
}
