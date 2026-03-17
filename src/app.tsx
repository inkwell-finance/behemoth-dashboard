import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
} from "react-router";
import { RootLayout } from "@/components/layout/root-layout";

// Lazy-loaded page components
const LeaderboardPage = lazy(() => import("@/tables/leaderboard/page"));
const ActivityPage = lazy(() => import("@/tables/activity/page"));
const SharpePage = lazy(() => import("@/tables/sharpe/page"));
const InspectorPage = lazy(() => import("@/tables/inspector/page"));
const PaperPage = lazy(() => import("@/tables/paper/page"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/leaderboard" replace />,
      },
      {
        path: "/leaderboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <LeaderboardPage />
          </Suspense>
        ),
      },
      {
        path: "/activity",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ActivityPage />
          </Suspense>
        ),
      },
      {
        path: "/evolution",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SharpePage />
          </Suspense>
        ),
      },
      {
        path: "/sharpe",
        element: <Navigate to="/evolution" replace />,
      },
      {
        path: "/paper",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaperPage />
          </Suspense>
        ),
      },
      {
        path: "/diagnostics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <InspectorPage />
          </Suspense>
        ),
      },
      {
        path: "/inspector",
        element: <Navigate to="/diagnostics" replace />,
      },
      {
        path: "/orders",
        element: <Navigate to="/leaderboard" replace />,
      },
      {
        path: "/fills",
        element: <Navigate to="/leaderboard" replace />,
      },
    ],
  },
]);
