import Link from "next/link";

import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { SocialLoginButtons } from "@/app/customer/components/social-login-buttons";
import { customerSignUpAction } from "@/app/customer/signup/actions";
import { prisma } from "@/lib/prisma";
import { customerSocialProviders } from "@/lib/social-providers";

export default async function CustomerSignupPage() {
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

        <h1 className="mt-8 text-3xl font-bold">Create Member Account</h1>
        <p className="mt-2 text-zinc-400">
          Join the customer portal for loyalty points and future rewards.
        </p>

        <SocialLoginButtons
          providers={customerSocialProviders}
          callbackURL="/account"
        />

        <form action={customerSignUpAction} className="mt-8 space-y-4">
          <TextInput name="name" label="Name" required />
          <TextInput name="email" label="Email" type="email" required />
          <TextInput name="password" label="Password" type="password" required />
          <TextInput
            name="confirmPassword"
            label="Retype password"
            type="password"
            required
          />

          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input
              name="marketingOptIn"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-emerald-500"
            />
            <span>Send me member rewards and restaurant updates.</span>
          </label>

          <button className="w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-emerald-400">
            Create account
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-500">
          Already a member?{" "}
          <Link
            href="/customer/login"
            className="text-emerald-300 hover:text-emerald-200"
          >
            Sign in
          </Link>
          .
        </p>
      </section>
    </main>
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
