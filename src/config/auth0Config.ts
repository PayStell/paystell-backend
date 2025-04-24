export const oauthConfig = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL || "http://localhost:4000",
  clientID: process.env.AUTH0_CLIENT_ID || "",
  clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
  issuerBaseURL: process.env.AUTH0_DOMAIN,
  secret: process.env.SESSION_SECRET || "a-long-randomly-generated-string",
  authorizationParams: {
    response_type: "code",
    scope: "openid profile email",
    audience: process.env.AUTH0_AUDIENCE || "",
  },
  routes: {
    login: "/auth/login-auth0",
    callback: "/auth/callback",
    postLogoutRedirect: "/",
  },
};
