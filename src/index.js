import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import SlicerApp from "./modules/slicer-app.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <SlicerApp />
  </React.StrictMode>,
);
