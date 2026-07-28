export type ApiResponse<T = unknown> = {
  data?: T;
  errors?: Record<string, unknown>;
  toast?: {
    title: string;
    description: string;
    type?: "success" | "error" | "info" | "warning";
  };
};
