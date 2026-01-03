import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import Facebook from "./pages/Facebook";
import Posts from "./pages/Posts";
import Exports from "./pages/Exports";
import AdminCustomers from "./pages/admin/Customers";
import AdminAccounts from "./pages/admin/Accounts";
import AdminReports from "./pages/admin/Reports";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/facebook" component={Facebook} />
      <Route path="/posts" component={Posts} />
      <Route path="/exports" component={Exports} />
      {/* Admin routes */}
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/accounts" component={AdminAccounts} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
