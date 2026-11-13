import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";

export interface HostingNotice {
  active: boolean;
  title: string;
  message: string;
  contactLabel: string;
  contactUrl: string;
}

export const DEFAULT_HOSTING_NOTICE: HostingNotice = {
  active: false,
  title: "Website Tidak Dapat Diakses",
  message: "Perpanjang hosting sekarang untuk mengaktifkan kembali website ini.",
  contactLabel: "Hubungi Developer",
  contactUrl: "",
};

const QUERY_KEY = ["hosting-notice"] as const;

export function useHostingNotice() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await apiFetch<{ notice: HostingNotice }>("/api/hosting-notice");
      return { ...DEFAULT_HOSTING_NOTICE, ...response.notice };
    },
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useSaveHostingNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notice: HostingNotice) => apiFetch<{ notice: HostingNotice }>("/api/hosting-notice", {
      method: "PUT",
      body: JSON.stringify(notice),
    }),
    onSuccess: async (response) => {
      queryClient.setQueryData(QUERY_KEY, response.notice);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
