import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FeedbackProvider } from "./context/FeedbackContext";
import "./styles/global.css";
import { applyTheme, loadTheme } from "./utils/theme";

// Terapkan tema sebelum React dirender agar tidak terjadi kilatan warna default.
applyTheme(loadTheme());

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </StrictMode>
);
