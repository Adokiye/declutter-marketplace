import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CurrentUser, DEV_ROLE_HEADER, DEV_USER_HEADER } from "./current-user";

export const DevUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUser => {
  const request = ctx.switchToHttp().getRequest();
  return {
    id: request.headers[DEV_USER_HEADER] ?? request.headers[DEV_USER_HEADER.toLowerCase()],
    role: request.headers[DEV_ROLE_HEADER] ?? "buyer"
  };
});
