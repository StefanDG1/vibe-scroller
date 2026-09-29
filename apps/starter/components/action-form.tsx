"use client";
import { useActionState } from "react";
import { Button } from "@companynerve/ui";
export type FormState = { error?: string; message?: string; link?: string };
export function ActionForm({
  action,
  children,
  label = "Save changes",
  danger = false,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children?: React.ReactNode;
  label?: string;
  danger?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="form-grid">
      {children}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="success" role="status">
          {state.message}
          {state.link && (
            <>
              {" "}
              <a href={state.link}>{state.link}</a>
            </>
          )}
        </p>
      )}
      <div>
        <Button
          type="submit"
          variant={danger ? "destructive" : "default"}
          disabled={pending}
        >
          {pending ? "Working…" : label}
        </Button>
      </div>
    </form>
  );
}
