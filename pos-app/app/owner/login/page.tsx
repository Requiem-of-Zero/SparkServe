import { redirect } from "next/navigation";

// Owner login intentionally reuses the staff code flow. The employee code maps
// to EmployeeProfile.role, so owner access is granted after the shared login.
export default function OwnerLoginRedirectPage() {
  redirect("/login");
}
