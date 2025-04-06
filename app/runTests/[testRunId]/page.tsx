import { use } from "react";
import RunTestsClient from "./RunTestsClient";
export default function RunTestsPage({
  params,
}: {
  params: Promise<{ testRunId: string }>;
}) {
  const { testRunId } = use(params);

  return <RunTestsClient testRunId={testRunId} />;
}
