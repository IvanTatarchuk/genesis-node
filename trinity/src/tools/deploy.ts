/**
 * DEPLOY TOOLS â€” Autonomous deployment management
 * Vercel (frontend) + Railway (backend services)
 * Agents can deploy, rollback, monitor deployments.
 */

import axios from "axios";
import { GrokTool } from "../core/grok";

const VERCEL_API = "https://api.vercel.com";
const RAILWAY_API = "https://backboard.railway.app/graphql/v2";
const RAILWAY_PROJECT_ID = "7f2fe8ec-7248-4429-b14a-419c90e5400c";
const RAILWAY_ENV_ID = "c6c54dd9-9a95-484e-ad70-15d9dd9b9537";

function vercelHeaders() {
  return { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` };
}

function railwayHeaders() {
  return { Authorization: process.env.RAILWAY_TOKEN!, "Content-Type": "application/json" };
}

// â”€â”€ Tool definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEPLOY_TOOLS: GrokTool[] = [
  {
    name: "get_deployment_status",
    description: "ĐźĐµŃ€ĐµĐ˛Ń–Ń€ŃŹŃ” ŃŃ‚Đ°Ń‚ŃŃ ĐľŃŃ‚Đ°Đ˝Đ˝Ń–Ń… Vercel Đ´ĐµĐżĐ»ĐľŃ—Đ˛ ĐżĐ»Đ°Ń‚Ń„ĐľŃ€ĐĽĐ¸",
    parameters: { type: "object", properties: { limit: { type: "number" } }, required: [] },
  },
  {
    name: "trigger_vercel_redeploy",
    description: "ĐźŃ€Đ¸ĐĽŃŃĐľĐ˛Đľ Đ·Đ°ĐżŃŃĐşĐ°Ń” Đ˝ĐľĐ˛Đ¸Đą Đ´ĐµĐżĐ»ĐľĐą Đ˝Đ° Vercel (ĐżŃ–ŃĐ»ŃŹ Đ·ĐĽŃ–Đ˝ Ń ĐşĐľĐ´Ń–)",
    parameters: {
      type: "object",
      properties: {
        deployment_id: { type: "string", description: "ID Đ´ĐµĐżĐ»ĐľŃŽ Đ´Đ»ŃŹ redeploy (Đ°Đ±Đľ Đ·Đ°Đ»Đ¸Ń ĐżĐľŃ€ĐľĐ¶Đ˝Ń–ĐĽ Đ´Đ»ŃŹ ĐľŃŃ‚Đ°Đ˝Đ˝ŃŚĐľĐłĐľ)" },
      },
      required: [],
    },
  },
  {
    name: "get_vercel_logs",
    description: "Đ§Đ¸Ń‚Đ°Ń” Đ»ĐľĐłĐ¸ Vercel Đ´ĐµĐżĐ»ĐľŃŽ Đ´Đ»ŃŹ Đ´Ń–Đ°ĐłĐ˝ĐľŃŃ‚Đ¸ĐşĐ¸ ĐżĐľĐĽĐ¸Đ»ĐľĐş",
    parameters: {
      type: "object",
      properties: { deployment_id: { type: "string" } },
      required: ["deployment_id"],
    },
  },
  {
    name: "rollback_deployment",
    description: "Đ’Ń–Đ´ĐşĐľŃ‡ŃŃ” Vercel Đ´Đľ ĐżĐľĐżĐµŃ€ĐµĐ´Đ˝ŃŚĐľĐłĐľ Ń€ĐľĐ±ĐľŃ‡ĐľĐłĐľ Đ´ĐµĐżĐ»ĐľŃŽ",
    parameters: {
      type: "object",
      properties: { deployment_id: { type: "string", description: "ID Đ´ĐµĐżĐ»ĐľŃŽ Đ´Đľ ŃŹĐşĐľĐłĐľ Đ˛Ń–Đ´ĐşĐľŃ‚Đ¸Ń‚Đ¸" } },
      required: ["deployment_id"],
    },
  },
  {
    name: "get_railway_services_status",
    description: "ĐźĐµŃ€ĐµĐ˛Ń–Ń€ŃŹŃ” ŃŃ‚Đ°Ń‚ŃŃ Đ˛ŃŃ–Ń… Railway ŃĐµŃ€Đ˛Ń–ŃŃ–Đ˛ (orchestrator, darwin, trinity)",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "restart_railway_service",
    description: "ĐźĐµŃ€ĐµĐ·Đ°ĐżŃŃĐşĐ°Ń” Railway ŃĐµŃ€Đ˛Ń–Ń (orchestrator, darwin Đ°Đ±Đľ trinity)",
    parameters: {
      type: "object",
      properties: {
        service_name: { type: "string", enum: ["orchestrator", "darwin", "trinity"], description: "ĐťĐ°Đ·Đ˛Đ° ŃĐµŃ€Đ˛Ń–ŃŃ" },
      },
      required: ["service_name"],
    },
  },
  {
    name: "set_env_variable",
    description: "Đ’ŃŃ‚Đ°Đ˝ĐľĐ˛Đ»ŃŽŃ” Đ°Đ±Đľ ĐľĐ˝ĐľĐ˛Đ»ŃŽŃ” Đ·ĐĽŃ–Đ˝Đ˝Ń ĐľŃ‚ĐľŃ‡ĐµĐ˝Đ˝ŃŹ Đ˝Đ° Vercel Đ°Đ±Đľ Railway",
    parameters: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["vercel", "railway"] },
        service: { type: "string", description: "Đ”Đ»ŃŹ Railway: service name; Đ´Đ»ŃŹ Vercel: Ń–ĐłĐ˝ĐľŃ€ŃŃ”Ń‚ŃŚŃŃŹ" },
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["platform", "key", "value"],
    },
  },
  {
    name: "check_domain_health",
    description: "ĐźĐµŃ€ĐµĐ˛Ń–Ń€ŃŹŃ” Đ´ĐľŃŃ‚ŃĐżĐ˝Ń–ŃŃ‚ŃŚ Ń‚Đ° Ń‡Đ°Ń Đ˛Ń–Đ´ĐżĐľĐ˛Ń–Đ´Ń– ĐľŃĐ˝ĐľĐ˛Đ˝ĐľĐłĐľ Đ´ĐľĐĽĐµĐ˝Ń ĐżĐ»Đ°Ń‚Ń„ĐľŃ€ĐĽĐ¸",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL Đ´Đ»ŃŹ ĐżĐµŃ€ĐµĐ˛Ń–Ń€ĐşĐ¸ (default: ĐłĐľĐ»ĐľĐ˛Đ˝Đ¸Đą Đ´ĐľĐĽĐµĐ˝ ĐżĐ»Đ°Ń‚Ń„ĐľŃ€ĐĽĐ¸)" },
      },
      required: [],
    },
  },
];

// â”€â”€ Service ID map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SERVICE_IDS: Record<string, string> = {
  orchestrator: "e3fb6c0f-3a53-4678-a475-8b8666ab2f6d",
  darwin: "e042721f-6d4d-4aeb-97a7-aed038ed4917",
  trinity: "6ed322b4-58de-4d43-b11f-35ae5f023259",
};

// â”€â”€ Executors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function executeDeployTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_deployment_status": {
      try {
        const res = await axios.get(`${VERCEL_API}/v6/deployments`, {
          headers: vercelHeaders(),
          params: { limit: args.limit ?? 5 },
        });
        return res.data.deployments.map((d: any) =>
          `[${d.state}] ${d.name} â€” ${new Date(d.createdAt).toLocaleString()} â€” ${d.url ?? "no url"}`
        ).join("\n");
      } catch (err: any) {
        return `Vercel API error: ${err.response?.data?.error?.message ?? err.message}`;
      }
    }

    case "trigger_vercel_redeploy": {
      try {
        // Get latest deployment ID if not provided
        let depId = args.deployment_id as string;
        if (!depId) {
          const list = await axios.get(`${VERCEL_API}/v6/deployments`, {
            headers: vercelHeaders(),
            params: { limit: 1 },
          });
          depId = list.data.deployments[0]?.uid;
        }
        if (!depId) return "No deployment found to redeploy";

        const res = await axios.post(`${VERCEL_API}/v13/deployments?forceNew=1`, {
          source: "cli",
          name: "genesis-node",
        }, { headers: vercelHeaders() });

        return `âś… Vercel redeploy triggered: ${res.data.url ?? "deploying..."}`;
      } catch (err: any) {
        return `Redeploy error: ${err.response?.data?.error?.message ?? err.message}`;
      }
    }

    case "get_vercel_logs": {
      try {
        const res = await axios.get(`${VERCEL_API}/v2/deployments/${args.deployment_id}/events`, {
          headers: vercelHeaders(),
        });
        const logs = res.data.slice(-30).map((e: any) => e.text ?? "").filter(Boolean);
        return logs.join("\n") || "No logs available";
      } catch (err: any) {
        return `Logs error: ${err.response?.data?.error?.message ?? err.message}`;
      }
    }

    case "rollback_deployment": {
      try {
        await axios.post(`${VERCEL_API}/v13/deployments/${args.deployment_id}/promote`, {}, {
          headers: vercelHeaders(),
        });
        return `âś… Rolled back to deployment ${args.deployment_id}`;
      } catch (err: any) {
        return `Rollback error: ${err.response?.data?.error?.message ?? err.message}`;
      }
    }

    case "get_railway_services_status": {
      const q = `{ project(id: "${RAILWAY_PROJECT_ID}") { services { edges { node { name deployments(first: 1) { edges { node { status createdAt } } } } } } } }`;
      const res = await axios.post(RAILWAY_API, { query: q }, { headers: railwayHeaders() });
      return res.data.data.project.services.edges.map((e: any) => {
        const dep = e.node.deployments.edges[0]?.node;
        return `${e.node.name}: ${dep?.status ?? "no deployment"} (${dep?.createdAt ? new Date(dep.createdAt).toLocaleString() : "â€”"})`;
      }).join("\n");
    }

    case "restart_railway_service": {
      const serviceId = SERVICE_IDS[args.service_name as string];
      if (!serviceId) return `Unknown service: ${args.service_name}`;
      const q = `mutation { serviceInstanceDeploy(serviceId: "${serviceId}", environmentId: "${RAILWAY_ENV_ID}") }`;
      const res = await axios.post(RAILWAY_API, { query: q }, { headers: railwayHeaders() });
      return res.data.data.serviceInstanceDeploy ? `âś… ${args.service_name} restarting...` : "Restart failed";
    }

    case "set_env_variable": {
      if (args.platform === "railway") {
        const svcId = SERVICE_IDS[args.service as string] ?? SERVICE_IDS.orchestrator;
        const q = `mutation { variableUpsert(input: { projectId: "${RAILWAY_PROJECT_ID}", serviceId: "${svcId}", environmentId: "${RAILWAY_ENV_ID}", name: "${args.key}", value: "${args.value}" }) }`;
        await axios.post(RAILWAY_API, { query: q }, { headers: railwayHeaders() });
        return `âś… Railway env var ${args.key} set for ${args.service}`;
      } else {
        // Vercel
        try {
          await axios.post(`${VERCEL_API}/v10/projects/genesis-node/env`, {
            key: args.key, value: args.value, type: "encrypted", target: ["production", "preview"],
          }, { headers: vercelHeaders() });
          return `âś… Vercel env var ${args.key} set`;
        } catch (err: any) {
          return `Vercel env error: ${err.response?.data?.error?.message ?? err.message}`;
        }
      }
    }

    case "check_domain_health": {
      const url = (args.url as string) ?? process.env.GENESIS_API_URL ?? "https://matadora.business";
      try {
        const start = Date.now();
        const res = await axios.get(url, { timeout: 10000 });
        const ms = Date.now() - start;
        return `âś… ${url} â€” HTTP ${res.status} â€” ${ms}ms response time`;
      } catch (err: any) {
        return `âťŚ ${url} â€” UNREACHABLE: ${err.message}`;
      }
    }

    default:
      return `Unknown deploy tool: ${name}`;
  }
}
