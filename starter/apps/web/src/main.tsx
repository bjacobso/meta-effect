import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createBrowserRouter } from "react-router-dom"
import { Provider as JotaiProvider } from "jotai"
import { EmployeesListPage } from "./routes/EmployeesListPage"
import { EmployeeDetailPage } from "./routes/EmployeeDetailPage"
import "./index.css"

const router = createBrowserRouter([
  {
    path: "/",
    element: <EmployeesListPage />,
  },
  {
    path: "/employees/:id",
    element: <EmployeeDetailPage />,
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <JotaiProvider>
      <RouterProvider router={router} />
    </JotaiProvider>
  </React.StrictMode>
)
