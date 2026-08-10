import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api", // define api folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "QB Auth API",
        version: "1.0",
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          CookieAuth: {
             type: "apiKey",
             in: "cookie",
             name: "qb.session_token"
          }
        },
        schemas: {
          Organization: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              logo: { type: "string", nullable: true },
              metadata: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          Member: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              organizationId: { type: "string" },
              role: { type: "string", enum: ["owner", "admin", "member"] },
              createdAt: { type: "string", format: "date-time" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  image: { type: "string", nullable: true },
                },
              },
            },
          },
          Invitation: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              role: { type: "string", enum: ["member", "admin"] },
              status: { type: "string", enum: ["pending", "accepted", "canceled", "expired"] },
              organizationId: { type: "string" },
              inviterId: { type: "string" },
              expiresAt: { type: "string", format: "date-time" },
              createdAt: { type: "string", format: "date-time" },
              inviter: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  image: { type: "string", nullable: true },
                },
              },
            },
          },
        },
      },
      tags: [
        { name: "User", description: "User profile and settings" },
        { name: "Organizations", description: "Organization management" },
        { name: "Invitations", description: "Invitation management" },
      ],
      security: [],
    },
  });
  return spec;
};
