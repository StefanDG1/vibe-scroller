"use client";
import { Button } from "@companynerve/ui";
import { clearLibraryPlaces } from "@/lib/library-place";
export function SignOutButton() {
  return (
    <Button
      variant="outline"
      type="submit"
      onClick={() => {
        try {
          clearLibraryPlaces(localStorage);
        } catch {
          /* Signing out does not depend on storage. */
        }
      }}
    >
      Sign out
    </Button>
  );
}
