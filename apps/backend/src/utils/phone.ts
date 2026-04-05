import { ApiError } from "./ApiError";

const RDC_PHONE_REGEX = /^\+?243\d{9}$/;

export function normalizeRdcPhone(rawPhone: string): string {
  const compact = rawPhone.replace(/[\s\-()]/g, "");

  if (!RDC_PHONE_REGEX.test(compact)) {
    throw new ApiError(400, "Numero invalide. Utilisez un numero RDC commençant par +243.");
  }

  return compact.startsWith("+") ? compact : `+${compact}`;
}
