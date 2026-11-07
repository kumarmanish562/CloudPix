"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type DashboardSummary } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: api.getDashboardSummary,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

