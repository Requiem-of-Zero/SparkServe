import { LoginForm } from "@/app/login/login-form";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  const restaurant = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-md">
        <RestaurantBrandLink
          logoUrl={restaurant?.logoUrl}
          name={restaurantName}
          markClassName="h-9 w-9"
        />

        <h1 className="mt-8 text-3xl font-bold">Staff Login</h1>
        <p className="mt-2 text-zinc-400">
          Owners, managers, and staff use the six-digit employee code provided
          by the restaurant. Your code determines which tools you can access.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}
