// Registers every API module with the router (import order = order in /api/docs).
import "./routes/auth";
import "./routes/learning";
import "./routes/marketplace";
import "./routes/contracts";
import "./routes/community";
import "./routes/admin";

export { dispatch } from "./router";
