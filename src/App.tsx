import ApiKeyModal from './components/ApiKeyModal';
import NoticeBar from './components/NoticeBar';
import Sidebar from './components/Sidebar';
import { I18nProvider } from './i18n/I18n';
import { StoreProvider, useStore } from './state/store';
import DashboardView from './views/DashboardView';
import HistoryView from './views/HistoryView';
import LoadView from './views/LoadView';
import ReportView from './views/ReportView';
import ResultsView from './views/ResultsView';
import SettingsView from './views/SettingsView';

const VIEWS = {
  load: LoadView,
  results: ResultsView,
  dashboard: DashboardView,
  report: ReportView,
  history: HistoryView,
  settings: SettingsView,
};

function Layout() {
  const { view, showKeyModal } = useStore();
  const View = VIEWS[view];
  // Resultados ocupa la altura de la ventana (tabla y panel con scroll propio); el resto hace scroll normal
  const fixedHeight = view === 'results';

  return (
    <div className="flex h-full gap-5 p-5">
      <Sidebar />
      <main className={`flex min-w-0 flex-1 flex-col ${fixedHeight ? 'overflow-hidden' : '-mr-3 overflow-y-auto pr-3'}`}>
        <NoticeBar />
        <div className={fixedHeight ? 'min-h-0 flex-1' : ''}>
          <View />
        </div>
      </main>
      {showKeyModal && <ApiKeyModal />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <Layout />
      </StoreProvider>
    </I18nProvider>
  );
}
