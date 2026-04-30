import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./lib/theme-provider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="pharma-theme">
    <App />
  </ThemeProvider>
);
