import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type ChatThread = {
  id: number;
  resellerId: number;
  subject: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminChatThread = ChatThread & {
  resellerCompanyName?: string | null;
  lastMessageAuthor?: "admin" | "reseller" | null;
  lastMessagePreview?: string | null;
};

export type ChatMessage = {
  id: number;
  threadId: number;
  authorRole: "admin" | "reseller";
  message: string;
  createdAt: string;
};

export function useResellerGetChatThread(options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number } }): UseQueryResult<ChatThread, Error> {
  return useQuery<ChatThread, Error>({
    queryKey: ["/api/chat/thread"],
    queryFn: () => customFetch<ChatThread>("/api/chat/thread"),
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useResellerGetChatMessages(options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number } }): UseQueryResult<ChatMessage[], Error> {
  return useQuery<ChatMessage[], Error>({
    queryKey: ["/api/chat/messages"],
    queryFn: () => customFetch<ChatMessage[]>("/api/chat/messages"),
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useResellerPostChatMessage(): UseMutationResult<ChatMessage, Error, { data: { message: string } }> {
  return useMutation({
    mutationFn: ({ data }) =>
      customFetch<ChatMessage>("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useAdminGetChatThreads(options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number } }): UseQueryResult<AdminChatThread[], Error> {
  return useQuery<AdminChatThread[], Error>({
    queryKey: ["/api/admin/chat/threads"],
    queryFn: () => customFetch<AdminChatThread[]>("/api/admin/chat/threads"),
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useAdminGetChatThreadMessages(threadId: number, options?: { query?: { enabled?: boolean; staleTime?: number; refetchInterval?: number } }): UseQueryResult<ChatMessage[], Error> {
  return useQuery<ChatMessage[], Error>({
    queryKey: [`/api/admin/chat/threads/${threadId}/messages`],
    queryFn: () => customFetch<ChatMessage[]>(`/api/admin/chat/threads/${threadId}/messages`),
    enabled: options?.query?.enabled ?? !!threadId,
    ...(options?.query ? { ...options.query } : {}),
  });
}

export function useAdminPostChatMessage(): UseMutationResult<ChatMessage, Error, { threadId: number; data: { message: string } }> {
  return useMutation({
    mutationFn: ({ threadId, data }) =>
      customFetch<ChatMessage>(`/api/admin/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
