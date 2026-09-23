import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WarehouseDashboard from "@/components/WarehouseDashboard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WarehouseDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;