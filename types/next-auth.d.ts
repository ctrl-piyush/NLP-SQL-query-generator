import { Role } from "./rbac";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: Role;
    allowedTables: string[];
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      allowedTables: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    email: string;
    role: Role;
    allowedTables: string[];
  }
}
