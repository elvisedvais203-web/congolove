import { ApiError } from "./ApiError";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeInternationalPhone(rawPhone: string): string {
  const compact = String(rawPhone ?? "").trim().replace(/[\s\-()]/g, "");
  if (!compact) {
    throw new ApiError(400, "Numero requis.");
  }

  if (!compact.startsWith("+")) {
    throw new ApiError(400, "Numero invalide. Utilisez le format international avec prefixe (ex: +243..., +33..., +1...).");
  }

  const parsed = parsePhoneNumberFromString(compact);
  if (!parsed || !parsed.isValid()) {
    throw new ApiError(400, "Numero invalide. Verifiez le prefixe pays et le format du numero.");
  }

  return parsed.number;
}

export const normalizeRdcPhone = normalizeInternationalPhone;
