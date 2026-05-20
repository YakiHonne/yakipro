import { useSelector } from 'react-redux'
import {
  selectSyncPhase,
  selectSyncProgress,
  selectSyncMessage,
  selectIsFirstRun,
} from '@/Store/analyticsSlice'

export function useSyncState() {
  const syncPhase = useSelector(selectSyncPhase)
  const syncProgress = useSelector(selectSyncProgress)
  const syncMessage = useSelector(selectSyncMessage)
  const isFirstRun = useSelector(selectIsFirstRun)

  return { syncPhase, syncProgress, syncMessage, isFirstRun }
}
