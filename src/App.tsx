import { useApp } from "@/store";
import { Header, ViewToggle } from "@/components/Header";
import { CostcoBanner } from "@/components/CostcoBanner";
import { MapView } from "@/components/MapView";
import { ListView } from "@/components/ListView";
import { SettingsDialog } from "@/components/SettingsDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AlertCircle } from "lucide-react";

export default function App() {
  const {
    loading,
    loadingText,
    error,
    currentView,
    costcoStations,
    settingsOpen,
    setSettingsOpen,
  } = useApp();

  if (loading) {
    return <LoadingScreen text={loadingText} />;
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-8 text-center">
        <div className="max-w-md space-y-3">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="text-lg font-semibold">Erreur</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <CostcoBanner stations={costcoStations} />

      {/* Disclaimer */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
        <span>
          ⚖️ Les prix affichés sont une obligation légale des stations — ils
          peuvent varier légèrement.
        </span>
      </div>

      {/* Content area */}
      <main className="relative flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 ${currentView === "map" ? "" : "hidden"}`}
        >
          <MapView />
        </div>
        <div
          className={`absolute inset-0 ${currentView === "list" ? "" : "hidden"}`}
        >
          <ListView />
        </div>
      </main>

      <ViewToggle />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
