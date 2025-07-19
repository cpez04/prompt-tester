"use client";

interface MetricsData {
  totalMessages: number;
  totalRuns: number;
  averageMessagesPerRun: number;
}

interface MetricsTabProps {
  metrics: MetricsData | null;
}

export default function MetricsTab({ metrics }: MetricsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics ? (
        <>
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title">Total Messages</h2>
              <p className="text-3xl font-bold">{metrics.totalMessages}</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title">Total Test Runs</h2>
              <p className="text-3xl font-bold">{metrics.totalRuns}</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title">Avg. Messages per Run</h2>
              <p className="text-3xl font-bold">
                {metrics.averageMessagesPerRun.toFixed(1)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="col-span-3 flex justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
    </div>
  );
}