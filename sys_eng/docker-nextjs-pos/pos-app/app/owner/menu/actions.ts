"use server";

import { redirect } from "next/navigation";

import { writeAuditEvent } from "@/lib/audit-log";
import { requireOwner } from "@/lib/employee-auth";
import { uploadMenuImageToR2 } from "@/lib/menu-image-storage";
import { prisma } from "@/lib/prisma";

// Small form readers keep server actions focused on menu behavior instead of parsing.
function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readPositiveInt(formData: FormData, key: string, fallback = 0) {
  const value = formData.get(key);
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return fallback;
  }

  return numberValue;
}

function readPriceCents(formData: FormData) {
  const rawPrice = readRequiredString(formData, "price");
  const price = Number(rawPrice);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a valid dollar amount.");
  }

  return Math.round(price * 100);
}

function toCategoryKey(categoryLabel: string | null) {
  if (!categoryLabel) {
    return null;
  }

  return (
    categoryLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || null
  );
}

function readIdSet(formData: FormData, key: string) {
  return new Set(
    formData
      .getAll(key)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

function readOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

// Replaces the whole ingredient mapping for a menu item so unchecked boxes are removed.
async function replaceMenuItemIngredients({
  menuItemId,
  ingredientIds,
  removableIngredientIds,
  swappableIngredientIds,
}: {
  menuItemId: number;
  ingredientIds: Set<number>;
  removableIngredientIds: Set<number>;
  swappableIngredientIds: Set<number>;
}) {
  const allergenIngredients = await prisma.ingredient.findMany({
    where: {
      id: { in: Array.from(ingredientIds) },
      commonAllergen: true,
    },
    select: { id: true },
  });
  const allergenIngredientIds = new Set(
    allergenIngredients.map((ingredient) => ingredient.id),
  );

  await prisma.menuItemIngredient.deleteMany({
    where: { menuItemId },
  });

  if (ingredientIds.size === 0) {
    return;
  }

  await prisma.menuItemIngredient.createMany({
    data: Array.from(ingredientIds).map((ingredientId, index) => ({
      menuItemId,
      ingredientId,
      removable:
        allergenIngredientIds.has(ingredientId) &&
        removableIngredientIds.has(ingredientId),
      swappable: swappableIngredientIds.has(ingredientId),
      sortOrder: index * 10,
    })),
    skipDuplicates: true,
  });
}

// Owner-only action for building the reusable ingredient list that menu items reference.
// These ingredient records will later become the bridge into inventory tracking.
export async function createIngredientAction(formData: FormData) {
  const owner = await requireOwner();
  const ingredientName = readRequiredString(formData, "name");

  const ingredient = await prisma.ingredient.upsert({
    where: { name: ingredientName },
    update: {
      commonAllergen: readBoolean(formData, "commonAllergen"),
      allergenNote: readOptionalString(formData, "allergenNote"),
      active: true,
    },
    create: {
      name: ingredientName,
      commonAllergen: readBoolean(formData, "commonAllergen"),
      allergenNote: readOptionalString(formData, "allergenNote"),
    },
  });

  await writeAuditEvent({
    action: "INGREDIENT_UPSERTED",
    employeeProfileId: owner.id,
    entityType: "Ingredient",
    entityId: ingredient.id,
    metadata: {
      name: ingredient.name,
      commonAllergen: ingredient.commonAllergen,
    },
  });

  redirect("/owner/menu?ingredient=saved");
}

// Owner-only action for creating and editing menu items plus their English display copy.
// The same save also refreshes the structured ingredient/allergy mapping.
export async function upsertMenuItemAction(formData: FormData) {
  const owner = await requireOwner();

  const menuItemId = readPositiveInt(formData, "menuItemId");
  const itemName = readRequiredString(formData, "name");
  const categoryLabel = readOptionalString(formData, "category");
  const uploadedImage = readOptionalFile(formData, "imageFile");
  const imageUrl =
    uploadedImage ? await uploadMenuImageToR2(uploadedImage) : readOptionalString(formData, "imageUrl");
  const ingredientIds = readIdSet(formData, "ingredientIds");
  const removableIngredientIds = readIdSet(formData, "removableIngredientIds");
  const swappableIngredientIds = readIdSet(formData, "swappableIngredientIds");
  const data = {
    priceCents: readPriceCents(formData),
    categoryKey: toCategoryKey(categoryLabel),
    sortOrder: readPositiveInt(formData, "sortOrder"),
    imageUrl,
    spicy: readBoolean(formData, "spicy"),
    active: readBoolean(formData, "active"),
  };

  const menuItem =
    menuItemId > 0
      ? await prisma.menuItem.update({
          where: { id: menuItemId },
          data,
        })
      : await prisma.menuItem.create({ data });

  await prisma.menuItemTranslation.upsert({
    where: {
      menuItemId_locale: {
        menuItemId: menuItem.id,
        locale: "en",
      },
    },
    update: {
      name: itemName,
      description: readOptionalString(formData, "description"),
      ingredients: readOptionalString(formData, "ingredients"),
      category: categoryLabel,
    },
    create: {
      menuItemId: menuItem.id,
      locale: "en",
      name: itemName,
      description: readOptionalString(formData, "description"),
      ingredients: readOptionalString(formData, "ingredients"),
      category: categoryLabel,
    },
  });

  await replaceMenuItemIngredients({
    menuItemId: menuItem.id,
    ingredientIds,
    removableIngredientIds,
    swappableIngredientIds,
  });

  await writeAuditEvent({
    action: menuItemId > 0 ? "MENU_ITEM_UPDATED" : "MENU_ITEM_CREATED",
    employeeProfileId: owner.id,
    entityType: "MenuItem",
    entityId: menuItem.id,
    metadata: {
      name: itemName,
      active: data.active,
      spicy: data.spicy,
      priceCents: data.priceCents,
      imageUploaded: Boolean(uploadedImage),
      ingredientIds: Array.from(ingredientIds),
    },
  });

  redirect(`/owner/menu?item=${menuItem.id}`);
}
