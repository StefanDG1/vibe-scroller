"use client";
import {
  readEditablePlan,
  type EditablePlan,
} from "../../../packages/plans/editor";
import { Plus, Trash2 } from "lucide-react";

export function PlanEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const plan = readEditablePlan(value);
  function update(next: EditablePlan) {
    onChange(JSON.stringify(next, null, 2));
  }
  const lines = [
    ["steps", "Implementation steps", 5],
    ["tests", "Checks to run", 4],
    ["nonGoals", "Out of scope", 3],
    ["risks", "Risks", 3],
    ["unknowns", "Open questions", 3],
  ] as const;
  return (
    <div className="plan-review">
      {plan ? (
        <fieldset disabled={disabled} className="plan-fields">
          <legend className="sr-only">Edit the implementation plan</legend>
          <label>
            Scope
            <textarea
              rows={3}
              maxLength={4000}
              value={plan.scope}
              onChange={(event) =>
                update({ ...plan, scope: event.target.value })
              }
            />
          </label>
          <fieldset className="plan-files">
            <legend>Affected files</legend>
            {plan.files.map((file, index) => (
              <div className="plan-file" key={index}>
                <label>
                  File {index + 1}
                  <input
                    value={file.path}
                    maxLength={300}
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder="src/example.ts"
                    onChange={(event) =>
                      update({
                        ...plan,
                        files: plan.files.map((old, at) =>
                          at === index
                            ? { ...old, path: event.target.value }
                            : old,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Change
                  <select
                    value={file.isNew ? "new" : "existing"}
                    onChange={(event) =>
                      update({
                        ...plan,
                        files: plan.files.map((old, at) =>
                          at === index
                            ? { ...old, isNew: event.target.value === "new" }
                            : old,
                        ),
                      })
                    }
                  >
                    <option value="existing">Existing file</option>
                    <option value="new">New file</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="secondary plan-remove"
                  aria-label={`Remove file ${index + 1}`}
                  disabled={plan.files.length === 1}
                  onClick={() =>
                    update({
                      ...plan,
                      files: plan.files.filter((_, at) => at !== index),
                    })
                  }
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={plan.files.length >= 100}
              onClick={() =>
                update({
                  ...plan,
                  files: [...plan.files, { path: "", isNew: true }],
                })
              }
            >
              <Plus size={16} aria-hidden="true" /> Add file
            </button>
          </fieldset>
          <p className="plan-hint">Use one item per line in the lists below.</p>
          {lines.map(([key, name, rows]) => (
            <label key={key}>
              {name}
              <textarea
                rows={rows}
                value={plan[key].join("\n")}
                onChange={(event) =>
                  update({ ...plan, [key]: event.target.value.split("\n") })
                }
              />
            </label>
          ))}
          <div className="plan-release">
            <label>
              Rollout
              <textarea
                rows={3}
                maxLength={2000}
                value={plan.rollout}
                onChange={(event) =>
                  update({ ...plan, rollout: event.target.value })
                }
              />
            </label>
            <label>
              Rollback
              <textarea
                rows={3}
                maxLength={2000}
                value={plan.rollback}
                onChange={(event) =>
                  update({ ...plan, rollback: event.target.value })
                }
              />
            </label>
          </div>
        </fieldset>
      ) : (
        <output>
          The JSON needs correction before the plan fields can be shown. Open
          JSON below to fix it.
        </output>
      )}
      <details open={!plan}>
        <summary>JSON</summary>
        <label>
          Plan JSON
          <textarea
            className="plan-editor"
            rows={16}
            value={value}
            disabled={disabled}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </details>
    </div>
  );
}
