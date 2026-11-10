import { json, route } from "@/lib/http";
import { ValidationError } from "@/lib/errors";
import { importReviews } from "@/lib/services/import-service";
import { MAX_IMPORT_BYTES } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Choose a .json file to import.");
  if (file.size === 0) throw new ValidationError("The file is empty.");
  if (file.size > MAX_IMPORT_BYTES) throw new ValidationError("The file is larger than 2 MB.");

  let parsed: unknown;
  try {
    parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
  } catch {
    throw new ValidationError("The file is not valid JSON.");
  }
  return json(await importReviews(parsed), 201);
});
