import { z } from "zod";
import { profileFieldNames } from "./business-context";
// The durable limit applies to the complete editable profile. Different
// projects need different amounts of detail in each section.
export const businessProfileSchema = z.strictObject(
  Object.fromEntries(
    profileFieldNames.map((field) => [field, z.string().min(1).max(8000)]),
  ),
);
export function serializeBusinessProfile(output: unknown) {
  const fields = businessProfileSchema.parse(output);
  return z
    .string()
    .max(8000)
    .parse(
      profileFieldNames
        .map((field) => `${field}: ${fields[field]}`)
        .join("\n\n"),
    );
}
