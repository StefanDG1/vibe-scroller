import {backend,api} from "@/lib/backend";
import type {Id} from "../../../../../../convex/_generated/dataModel";
export async function GET(_:Request,{params}:{params:Promise<{org:string}>}){return Response.json(await (await backend()).query(api.jobs.exportData,{organizationId:(await params).org as Id<"organizations">}),{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=vibescroller-export.json"}})}
