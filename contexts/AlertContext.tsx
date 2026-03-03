import React, { useState, useCallback, createContext, useContext, ReactNode } from "react";
import CustomAlert, { AlertConfig, AlertButton } from "@/components/CustomAlert";

type AlertContextType = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
};

const AlertContext = createContext<AlertContextType>({ showAlert: () => {} });

export function AlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<boolean>(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setConfig({ title, message, buttons });
      setVisible(true);
    },
    []
  );

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert visible={visible} config={config} onDismiss={dismiss} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
