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
      },
      security: [],
    },
  });
  return spec;
};
