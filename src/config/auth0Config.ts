export const oauthConfig = {
  authRequired: false, // auth not required for all routes
  auth0Logout: true, // enable Auth0 logout
  baseURL: process.env.BASE_URL || "http://localhost:8080", // app base URL
  clientID: process.env.AUTH0_CLIENT_ID || "", // Auth0 client ID
  clientSecret: process.env.AUTH0_CLIENT_SECRET || "", // Auth0 client secret
  issuerBaseURL: process.env.AUTH0_DOMAIN, // Auth0 domain URL
  secret: process.env.SESSION_SECRET || "a-long-randomly-generated-string", // session secret
  authorizationParams: {
    response_type: "code", // OAuth2 response type
    scope: "openid profile email", // requested scopes
    audience: process.env.AUTH0_AUDIENCE || "", // token audience
  },
  routes: {
    login: "/auth/login-auth0", // login route
    callback: "/auth/callback", // OAuth callback route
    postLogoutRedirect: "/", // redirect after logout
  },
};
