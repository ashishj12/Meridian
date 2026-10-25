import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "@fontsource-variable/instrument-sans";
import "./styles/index.css";
import "./design-system/readability.css";
import "./features/passenger/passenger.css";
import "./design-system/products.css";
import "./features/admin/admin.css";
import "./design-system/meridian-brand.css";
import "./design-system/admin-dark.css";
import "./styles/responsive.css";

createRoot(document.getElementById("root")!).render(<App />);
