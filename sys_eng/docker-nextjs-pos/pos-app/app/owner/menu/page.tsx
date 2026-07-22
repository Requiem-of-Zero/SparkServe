import Link from "next/link";

import {
  createIngredientAction,
  upsertMenuItemAction,
} from "@/app/owner/menu/actions";
import { LogoutButton } from "@/app/components/logout-button";
import { RestaurantBrandLink } from "@/app/components/restaurant-brand-link";
import { requireOwner } from "@/lib/employee-auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AdminMenuItem = Prisma.MenuItemGetPayload<{
  include: {
    translations: true;
    ingredients: {
      include: {
        ingredient: true;
      };
      orderBy: [{ sortOrder: "asc" }, { ingredient: { name: "asc" } }];
    };
  };
}>;

type AdminIngredient = Prisma.IngredientGetPayload<object>;

type MenuPageProps = {
  searchParams?: Promise<{
    item?: string;
    ingredient?: string;
  }>;
};

function formatPrice(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

function getEnglishTranslation(item: AdminMenuItem) {
  return item.translations.find((translation) => translation.locale === "en");
}

export default async function OwnerMenuPage({ searchParams }: MenuPageProps) {
  await requireOwner();

  const params = await searchParams;
  // Load menu items and the reusable ingredient catalog together for the editor.
  const [menuItems, ingredients, restaurant] = await Promise.all([
    prisma.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        translations: true,
        ingredients: {
          orderBy: [{ sortOrder: "asc" }, { ingredient: { name: "asc" } }],
          include: { ingredient: true },
        },
      },
    }),
    prisma.ingredient.findMany({
      orderBy: [{ commonAllergen: "desc" }, { name: "asc" }],
    }),
    prisma.restaurantSettings.findUnique({ where: { id: 1 } }),
  ]);
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <RestaurantBrandLink
              logoUrl={restaurant?.logoUrl}
              name={restaurantName}
              markClassName="h-9 w-9"
            />
            <Link
              href="/owner/employees"
              className="text-sm text-zinc-400 hover:text-white"
            >
              Back to owner tools
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Menu management</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Manage menu items, reusable ingredients, and allergy-sensitive
              ingredient flags before inventory tracking is added.
            </p>
          </div>
          <LogoutButton />
        </div>

        {params?.item ? (
          <StatusBanner tone="emerald">
            Saved menu item #{params.item}.
          </StatusBanner>
        ) : null}
        {params?.ingredient ? (
          <StatusBanner tone="amber">Saved ingredient.</StatusBanner>
        ) : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <IngredientForm />
            <IngredientList ingredients={ingredients} />
          </aside>

          <section className="space-y-6">
            <NewMenuItemCard ingredients={ingredients} />
            {menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                ingredients={ingredients}
              />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusBanner({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "emerald";
}) {
  // Simple save feedback after server actions redirect back to this page.
  const classes =
    tone === "emerald"
      ? "border-emerald-800 bg-emerald-950 text-emerald-200"
      : "border-amber-800 bg-amber-950 text-amber-200";

  return (
    <div className={`mt-6 rounded-lg border p-4 text-sm ${classes}`}>
      {children}
    </div>
  );
}

function IngredientForm() {
  // Ingredients are shared across menu items now and can become inventory SKUs later.
  return (
    <form
      action={createIngredientAction}
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
    >
      <h2 className="text-xl font-semibold">Ingredient catalog</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Add ingredients once, then attach them to menu items with remove/swap
        options.
      </p>
      <div className="mt-5 space-y-4">
        <TextInput name="name" label="Ingredient name" required />
        <TextInput
          name="allergenNote"
          label="Allergen note"
          placeholder="Contains shellfish, dairy, peanuts..."
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            name="commonAllergen"
            type="checkbox"
            className="h-4 w-4 accent-orange-500"
          />
          Common allergy concern
        </label>
      </div>
      <button className="mt-5 w-full rounded-md bg-orange-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-orange-400">
        Save ingredient
      </button>
    </form>
  );
}

function IngredientList({ ingredients }: { ingredients: AdminIngredient[] }) {
  // Shows the owner which ingredients are available to attach to menu items.
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="font-semibold">Current ingredients</h2>
      <div className="mt-4 space-y-2">
        {ingredients.length === 0 ? (
          <p className="text-sm text-zinc-500">No ingredients yet.</p>
        ) : null}
        {ingredients.map((ingredient) => (
          <div
            key={ingredient.id}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{ingredient.name}</p>
              {ingredient.commonAllergen ? (
                <span className="rounded border border-amber-700 px-2 py-1 text-xs text-amber-200">
                  Allergy
                </span>
              ) : null}
            </div>
            {ingredient.allergenNote ? (
              <p className="mt-1 text-xs text-zinc-500">
                {ingredient.allergenNote}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewMenuItemCard({ ingredients }: { ingredients: AdminIngredient[] }) {
  // New items use the same form as existing items, just without an id.
  return (
    <div className="rounded-lg border border-orange-800 bg-orange-950/30 p-5">
      <h2 className="text-xl font-semibold">New menu item</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Create the item first in English. More translation editing can be added
        after the owner menu workflow is stable.
      </p>
      <MenuItemForm ingredients={ingredients} />
    </div>
  );
}

function MenuItemCard({
  item,
  ingredients,
}: {
  item: AdminMenuItem;
  ingredients: AdminIngredient[];
}) {
  // Existing item card shows the saved summary and embeds the edit form below it.
  const translation = getEnglishTranslation(item);
  const allergyIngredients = item.ingredients.filter(
    (entry) => entry.ingredient.commonAllergen,
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {translation?.name ?? `Menu item #${item.id}`}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            #{item.id} · {item.active ? "Active" : "Hidden"} · $
            {formatPrice(item.priceCents)}
          </p>
        </div>
        {allergyIngredients.length > 0 ? (
          <div className="rounded-md border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-100">
            Allergy flags:{" "}
            {allergyIngredients
              .map((entry) => entry.ingredient.name)
              .join(", ")}
          </div>
        ) : null}
      </div>
      <MenuItemForm item={item} ingredients={ingredients} />
    </div>
  );
}

function MenuItemForm({
  item,
  ingredients,
}: {
  item?: AdminMenuItem;
  ingredients: AdminIngredient[];
}) {
  // One form handles both create and edit, including ingredient remove/swap options.
  const translation = item ? getEnglishTranslation(item) : null;
  const attachedIngredientIds = new Set(
    item?.ingredients.map((entry) => entry.ingredientId) ?? [],
  );
  const removableIngredientIds = new Set(
    item?.ingredients
      .filter((entry) => entry.removable)
      .map((entry) => entry.ingredientId) ?? [],
  );
  const swappableIngredientIds = new Set(
    item?.ingredients
      .filter((entry) => entry.swappable)
      .map((entry) => entry.ingredientId) ?? [],
  );

  return (
    <form
      action={upsertMenuItemAction}
      encType="multipart/form-data"
      className="mt-5 space-y-5"
    >
      {item ? <input name="menuItemId" type="hidden" value={item.id} /> : null}
      {item?.imageUrl ? (
        <input name="imageUrl" type="hidden" value={item.imageUrl} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          name="name"
          label="Name"
          defaultValue={translation?.name}
          required
        />
        <TextInput
          name="price"
          label="Price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item ? formatPrice(item.priceCents) : undefined}
          required
        />
        <TextInput
          name="category"
          label="Category"
          defaultValue={translation?.category ?? undefined}
          placeholder="Noodles"
        />
        <TextInput
          name="sortOrder"
          label="Sort order"
          type="number"
          min="0"
          defaultValue={item?.sortOrder}
        />
        <ImageUploadField imageUrl={item?.imageUrl} />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          name="spicy"
          type="checkbox"
          defaultChecked={item?.spicy ?? false}
          className="h-4 w-4 accent-orange-500"
        />
        Spicy item, show customer spice-level choices
      </label>

      <Textarea
        name="description"
        label="Description"
        defaultValue={translation?.description ?? undefined}
      />
      <Textarea
        name="ingredients"
        label="Customer ingredient summary"
        defaultValue={translation?.ingredients ?? undefined}
        placeholder="Beef, wheat noodles, broth, scallions"
      />

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Structured ingredients</h3>
          <p className="text-xs text-zinc-500">
            Attach ingredients for allergies now and inventory later.
          </p>
        </div>
        <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
          {ingredients.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Add ingredients in the catalog before attaching them.
            </p>
          ) : null}
          {ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="w-64 shrink-0 rounded-md border border-zinc-800 bg-zinc-950 p-3"
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  name="ingredientIds"
                  type="checkbox"
                  value={ingredient.id}
                  defaultChecked={attachedIngredientIds.has(ingredient.id)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span>
                  <span className="font-medium">{ingredient.name}</span>
                  {ingredient.commonAllergen ? (
                    <span className="ml-2 rounded border border-amber-700 px-2 py-0.5 text-xs text-amber-200">
                      Allergy
                    </span>
                  ) : null}
                  {ingredient.allergenNote ? (
                    <span className="mt-1 block text-xs text-zinc-500">
                      {ingredient.allergenNote}
                    </span>
                  ) : null}
                </span>
              </label>
              <div className="mt-3 flex flex-wrap gap-4 pl-6 text-xs text-zinc-400">
                {ingredient.commonAllergen ? (
                  <label className="flex items-center gap-2">
                    <input
                      name="removableIngredientIds"
                      type="checkbox"
                      value={ingredient.id}
                      defaultChecked={removableIngredientIds.has(ingredient.id)}
                      className="h-3.5 w-3.5 accent-emerald-500"
                    />
                    Customer can remove for allergy
                  </label>
                ) : (
                  <span>Main ingredient, display only</span>
                )}
                <label className="flex items-center gap-2">
                  <input
                    name="swappableIngredientIds"
                    type="checkbox"
                    value={ingredient.id}
                    defaultChecked={swappableIngredientIds.has(ingredient.id)}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  Future swap option
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          name="active"
          type="checkbox"
          defaultChecked={item?.active ?? true}
          className="h-4 w-4 accent-orange-500"
        />
        Active on customer menus
      </label>

      <button className="rounded-md bg-orange-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-orange-400">
        {item ? "Save menu item" : "Create menu item"}
      </button>
    </form>
  );
}

function ImageUploadField({ imageUrl }: { imageUrl?: string | null }) {
  // Uploads are sent through the owner server action and stored in R2.
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-zinc-300">Menu photo</span>
      <div className="mt-2 grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="h-28 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
              No image yet
            </div>
          )}
        </div>
        <div>
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:font-semibold file:text-zinc-950"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Upload JPG, PNG, WebP, or GIF up to 4MB. Existing photos stay in
            place unless a new file is selected.
          </p>
        </div>
      </div>
    </label>
  );
}

function TextInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  // Shared input styling keeps the owner form layout consistent.
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <input
        {...props}
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500"
      />
    </label>
  );
}

function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  // Shared textarea styling for longer menu copy fields.
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <textarea
        {...props}
        rows={3}
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500"
      />
    </label>
  );
}
