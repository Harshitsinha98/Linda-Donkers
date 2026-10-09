import { createContext, useContext } from "react";

/** True once the preloader has started lifting, so hero animations can begin in sync. */
export const IntroContext = createContext(false);
export const useIntroReady = () => useContext(IntroContext);
