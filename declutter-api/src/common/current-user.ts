export type CurrentUser = {
  id: string;
  role: "buyer" | "seller" | "admin" | "support";
};

export const DEV_USER_HEADER = "x-dev-user-id";
export const DEV_ROLE_HEADER = "x-dev-role";
