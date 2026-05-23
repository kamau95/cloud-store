import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import AdminApp from "./App";
import "../index.css";

createRoot(document.getElementById("admin-root")!).render(
  <StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        className: "bg-gray-800 text-gray-100 border border-gray-700",
        duration: 4000,
      }}
    />
    <AdminApp />
  </StrictMode>
);
