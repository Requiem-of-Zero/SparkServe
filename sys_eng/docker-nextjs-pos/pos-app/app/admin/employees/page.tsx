import Link from "next/link";

import {
  bootstrapOwnerAction,
  createEmployeeAction,
} from "@/app/admin/employees/actions";
import { LogoutButton } from "@/app/components/logout-button";
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
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const ownerExists = Boolean(
    await prisma.employeeProfile.findFirst({ where: { role: "OWNER" } }),
  );
  const currentEmployee = await getCurrentEmployee();

  if (!ownerExists) {
    return <BootstrapOwnerScreen createdCode={params?.created} />;
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
            Sign in with the owner email and password to manage staff accounts.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-flex rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Go to owner login
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <EmployeeForm />
          <EmployeeTable employees={employees} />
        </div>
      </section>
    </main>
  );
}

function BootstrapOwnerScreen({ createdCode }: { createdCode?: string }) {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
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
              href="/admin/login"
              className="mt-4 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Continue to owner login
            </Link>
          </div>
        ) : null}

        <form action={bootstrapOwnerAction} className="mt-8 space-y-4">
          <TextInput name="name" label="Owner name" required />
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
  return (
    <form
      action={createEmployeeAction}
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
    >
      <h2 className="text-xl font-semibold">New employee</h2>
      <div className="mt-5 space-y-4">
        <TextInput name="name" label="Name" required />
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
  employees,
}: {
  employees: EmployeeWithUser[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-950 text-zinc-400">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Hired</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="border-t border-zinc-800">
              <td className="px-4 py-3 font-mono">{employee.user.username}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{employee.user.name}</div>
                <div className="text-zinc-500">{employee.user.email}</div>
              </td>
              <td className="px-4 py-3">{employee.role}</td>
              <td className="px-4 py-3">
                {employee.active && !employee.resignedAt ? "Active" : "Inactive"}
              </td>
              <td className="px-4 py-3">
                {employee.hiredAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextInput({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
      />
    </label>
  );
}
