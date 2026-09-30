"use client";
import { useEffect } from "react";
import { recipeIds } from "@companynerve/company-config";
export function RecipeTheme() {
  useEffect(() => {
    const apply = () => {
      try {
        const value = localStorage.getItem("vibescroller-design-recipe");
        if (recipeIds.some((id) => id === value))
          document.documentElement.dataset.recipe = value!;
      } catch {
        /* Browser preview storage is optional. */
      }
    };
    apply();
    window.addEventListener("vibescroller-recipe", apply);
    return () => window.removeEventListener("vibescroller-recipe", apply);
  }, []);
  return null;
}
