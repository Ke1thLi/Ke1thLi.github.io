import settings from "../../site.config.mjs";
import { resolveSite } from "./resolve-site.mjs";

export const siteConfig = resolveSite(settings, process.env);
