import { useCallback, useEffect, useState } from "react";
import {
  getPushState,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
  type PushState,
} from "@/services/pushNotifications";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);
  const supported = isPushSupported();

  const refresh = useCallback(async () => {
    setState(await getPushState());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    const res = await subscribeToPush();
    await refresh();
    setBusy(false);
    return res;
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    const res = await unsubscribeFromPush();
    await refresh();
    setBusy(false);
    return res;
  }, [refresh]);

  const test = useCallback(async () => {
    setBusy(true);
    const res = await sendTestPush();
    setBusy(false);
    return res;
  }, []);

  return { state, supported, busy, enable, disable, test, refresh };
}
