// Shared FormData readers keep server actions focused on business behavior.
export function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function readPositiveInteger(formData: FormData, key: string) {
  const value = Number(formData.get(key));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export function readNonNegativeInteger(
  formData: FormData,
  key: string,
  fallback = 0,
) {
  const value = formData.get(key);
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return fallback;
  }

  return numberValue;
}

export function readIdSet(formData: FormData, key: string) {
  return new Set(
    formData
      .getAll(key)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

export function readOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}
