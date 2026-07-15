import { type RequestHandler } from "express";
import { type ZodTypeAny, ZodError } from "zod";

/**
 * Validation error shape returned by admin routes.
 * Superset of AdminApiError (see lib/adminApiError.ts) with a
 * `fieldErrors` map so the client can highlight per-field issues.
 */
export interface AdminValidationError {
  ok: false;
  error: "validation_failed";
  endpoint: string;
  status: 400;
  detail: string;
  code: "VALIDATION_ERROR";
  hint: string;
  timestamp: string;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}

export function validate(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const flat = (result.error as ZodError).flatten();
      const fieldErrors = flat.fieldErrors as Record<string, string[]>;
      const formErrors = flat.formErrors ?? [];

      const failingFields = Object.keys(fieldErrors);
      const firstIssue =
        failingFields[0] && fieldErrors[failingFields[0]]?.[0];
      const detail =
        firstIssue && failingFields[0]
          ? `${failingFields[0]}: ${firstIssue}`
          : formErrors[0] ?? "Request body gagal validasi";

      const endpoint = `${req.method} ${req.baseUrl}${req.path}`.replace(
        /\/+$/,
        "",
      );

      const body: AdminValidationError = {
        ok: false,
        error: "validation_failed",
        endpoint,
        status: 400,
        detail,
        code: "VALIDATION_ERROR",
        hint:
          failingFields.length > 0
            ? `Cek field berikut: ${failingFields.join(", ")}. ` +
              "Field opsional boleh null/undefined, tetapi bila diisi harus sesuai tipe."
            : "Payload request tidak sesuai skema.",
        timestamp: new Date().toISOString(),
        fieldErrors,
        formErrors,
      };

      console.warn(`[admin-api] ${endpoint} → 400 validation_failed`, {
        fields: failingFields,
      });

      res.status(400).json(body);
      return;
    }

    req.body = result.data;
    next();
  };
}
