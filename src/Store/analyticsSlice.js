import { createSlice } from '@reduxjs/toolkit'

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    syncPhase: 'idle',
    syncProgress: 0,
    syncMessage: '',
    lastSyncedAt: null,
    isFirstRun: false,
    liveEvents: [],
  },
  reducers: {
    setSyncPhase(state, action) {
      state.syncPhase = action.payload
    },
    setSyncProgress(state, action) {
      state.syncProgress = action.payload.percent ?? state.syncProgress
      state.syncMessage = action.payload.message ?? state.syncMessage
    },
    setIsFirstRun(state, action) {
      state.isFirstRun = action.payload
    },
    setLastSyncedAt(state, action) {
      state.lastSyncedAt = action.payload
    },
    liveEventReceived(state, action) {
      state.liveEvents.unshift(action.payload)
      if (state.liveEvents.length > 10) {
        state.liveEvents.pop()
      }
    },
  },
})

export const {
  setSyncPhase,
  setSyncProgress,
  setIsFirstRun,
  setLastSyncedAt,
  liveEventReceived,
} = analyticsSlice.actions

export const selectSyncPhase = (state) => state.analytics.syncPhase
export const selectSyncProgress = (state) => state.analytics.syncProgress
export const selectSyncMessage = (state) => state.analytics.syncMessage
export const selectIsFirstRun = (state) => state.analytics.isFirstRun
export const selectLiveEvents = (state) => state.analytics.liveEvents

export const AnalyticsReducer = analyticsSlice.reducer
