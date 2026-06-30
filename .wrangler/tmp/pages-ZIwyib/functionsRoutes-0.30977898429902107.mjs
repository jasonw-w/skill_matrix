import { onRequestPost as __api_check_code_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\check-code.js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\login.js"
import { onRequestPost as __api_logout_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\logout.js"
import { onRequestGet as __api_matrix_data_js_onRequestGet } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\matrix-data.js"
import { onRequestPost as __api_register_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\register.js"
import { onRequestGet as __api_session_js_onRequestGet } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\session.js"
import { onRequestPost as __api_verify_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\verify.js"

export const routes = [
    {
      routePath: "/api/check-code",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_check_code_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logout_js_onRequestPost],
    },
  {
      routePath: "/api/matrix-data",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_matrix_data_js_onRequestGet],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_js_onRequestPost],
    },
  {
      routePath: "/api/session",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_session_js_onRequestGet],
    },
  {
      routePath: "/api/verify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_js_onRequestPost],
    },
  ]