import { route, uuid } from "@/server/api";
import { getAutomationRules } from "@/server/services/automation";
import { getDayPlan, getLookahead } from "@/server/services/day";
import { getFinance } from "@/server/services/finance";
import { getHardware } from "@/server/services/hardware";
import { getMetricCards } from "@/server/services/metrics";
import { getProjectOverview } from "@/server/services/projects";
import { getTimeline } from "@/server/services/timeline";

/** Aggregate for clients (e.g. mobile) that want the whole "today" screen in one round trip. */
export const GET = route<{ projectId: string }>(async ({ user, params }) => {
  const projectId = uuid.parse(params.projectId);
  const project = await getProjectOverview(user.id, projectId);
  // IoT sections are omitted (null) for projects that did not opt in.
  const iot = project.iotEnabled;
  const [timeline, metrics, day, lookahead, hardware, finance, automationRules] = await Promise.all([
    getTimeline(user.id, projectId),
    iot ? getMetricCards(projectId) : null,
    getDayPlan(projectId, project.currentDay),
    getLookahead(projectId, project.currentDay),
    iot ? getHardware(projectId) : null,
    getFinance(user.id, projectId),
    iot ? getAutomationRules(projectId) : null,
  ]);
  return { project, timeline, metrics, day, lookahead, hardware, finance, automationRules };
});
