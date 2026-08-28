import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { useIsFetching } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { EntryLoadingScreen } from "./components/entry-loading/EntryLoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CashFlowPage from "./pages/CashFlowPage";
import DashboardPage from "./pages/DashboardPage";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import PropertiesPage from "./pages/PropertiesPage";

function DashboardRoute() {
  return <DashboardLayout><DashboardPage /></DashboardLayout>;
}

function PropertiesRoute() {
  return <DashboardLayout><PropertiesPage /></DashboardLayout>;
}

function CashFlowRoute() {
  return <DashboardLayout><CashFlowPage /></DashboardLayout>;
}

function ProfileRoute() {
  return <DashboardLayout><ProfilePage /></DashboardLayout>;
}

function Router() {
  // "/" is the public marketing homepage; the financial platform lives under "/dashboard".
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/dashboard"} component={DashboardRoute} />
      <Route path={"/propriedades"} component={PropertiesRoute} />
      <Route path={"/fluxo-de-caixa"} component={CashFlowRoute} />
      <Route path={"/perfil"} component={ProfileRoute} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - Platform (dashboard) uses a sober light financial theme — see client/src/index.css.
//   The public homepage layers its own dark, cinematic sections independently via
//   explicit utility classes and does not rely on a dark ThemeProvider mode.
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const initialQueriesInFlight = useIsFetching();
  const forceLoadingPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("loading-preview") === "1";

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <EntryLoadingScreen
            loading={initialQueriesInFlight > 0}
            forcePreview={forceLoadingPreview}
          />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
