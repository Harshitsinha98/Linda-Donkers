import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useCallback, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Preloader } from "./components/Preloader";
import { SmoothScroll, scrollToTop } from "./components/SmoothScroll";
import { Cursor } from "./components/Cursor";
import { IntroContext } from "./components/IntroContext";
import { LogoMark } from "./components/Logo";
import { MobileBar } from "./components/MobileBar";
import { ROUTES } from "./data/site";
import Home from "./pages/Home";

const About = lazy(() => import("./pages/About"));
const Yoga = lazy(() => import("./pages/Yoga"));
const Massage = lazy(() => import("./pages/Massage"));
const Travel = lazy(() => import("./pages/Travel"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));
const Legal = lazy(() => import("./pages/Legal"));
const Agenda = lazy(() => import("./pages/Agenda"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const BookingStatus = lazy(() => import("./pages/BookingStatus"));
const AdminApp = lazy(() => import("./admin/AdminApp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const EASE = [0.76, 0, 0.24, 1] as const;

/** Beige curtain that sweeps over the screen between pages. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.25 } }} exit={{ opacity: 1 }}>
        {children}
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-sand"
        initial={{ y: "0%" }}
        animate={{ y: "-100%", transition: { duration: 0.9, ease: EASE, delay: 0.1 } }}
        exit={{ y: ["100%", "0%"], transition: { duration: 0.7, ease: EASE } }}
      >
        <LogoMark className="h-14 w-14 text-forest/40" />
      </motion.div>
    </>
  );
}

export default function App() {
  const location = useLocation();
  // Linda's admin panel is a plain tool: no preloader, smooth scroll, custom cursor or site chrome.
  if (location.pathname.startsWith(ROUTES.admin)) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-cream" />}>
        <AdminApp />
      </Suspense>
    );
  }
  return <Site />;
}

function Site() {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <IntroContext.Provider value={ready}>
      <SmoothScroll />
      <Cursor />
      <Preloader onDone={onReady} />
      <Header />
      <main id="main">
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => scrollToTop(true)}>
          <Suspense key={location.pathname} fallback={<div className="min-h-screen" />}>
            <Routes location={location}>
              <Route path={ROUTES.home} element={<Page><Home /></Page>} />
              <Route path={ROUTES.about} element={<Page><About /></Page>} />
              <Route path={ROUTES.yoga} element={<Page><Yoga /></Page>} />
              <Route path={ROUTES.massage} element={<Page><Massage /></Page>} />
              <Route path={ROUTES.agenda} element={<Page><Agenda /></Page>} />
              <Route path={`${ROUTES.agenda}/:id`} element={<Page><SessionDetail /></Page>} />
              <Route path={`${ROUTES.booking}/:ref`} element={<Page><BookingStatus /></Page>} />
              <Route path={ROUTES.travel} element={<Page><Travel /></Page>} />
              <Route path={ROUTES.gallery} element={<Page><Gallery /></Page>} />
              <Route path={ROUTES.contact} element={<Page><Contact /></Page>} />
              <Route path={ROUTES.privacy} element={<Page><Legal kind="privacy" /></Page>} />
              <Route path={ROUTES.terms} element={<Page><Legal kind="terms" /></Page>} />
              <Route path="*" element={<Page><NotFound /></Page>} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileBar />
    </IntroContext.Provider>
  );
}
