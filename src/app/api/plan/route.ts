import { handleStage } from "../../../lib/stage-api";

export async function POST(request: Request) {
  return handleStage("plan", request);
}
