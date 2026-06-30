import { onRequestPost as __api_login_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\login.js"
import { onRequestPost as __api_register_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\register.js"
import { onRequestPost as __api_verify_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\verify.js"

export const routes = [
    {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_js_onRequestPost],
    },
  {
      routePath: "/api/verify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_js_onRequestPost],
    },
  ]