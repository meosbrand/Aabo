/**
 * @fileoverview Custom hook for displaying toast notifications.
 * Inspired by the react-hot-toast library, this provides a simple API
 * for creating, updating, and dismissing toasts throughout the application.
 */
"use client"

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// The maximum number of toasts to display at once.
const TOAST_LIMIT = 1
// Delay in milliseconds before a toast is removed from the DOM after being dismissed.
const TOAST_REMOVE_DELAY = 1000000

/**
 * The shape of a toast object used internally by the toaster state.
 */
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Action types for the toast reducer.
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

// Internal counter for generating unique toast IDs.
let count = 0

/**
 * Generates a unique numeric ID for a toast.
 * @returns {string} A unique ID as a string.
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// Type definitions for the reducer actions.
type ActionType = typeof actionTypes

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] }

// Interface for the reducer state.
interface State {
  toasts: ToasterToast[]
}

// Reducer function to manage toast state.
const toastReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }
    
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// Array to hold listener functions that will be called on state changes.
const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

/**
 * Dispatches an action to all registered listeners and updates the memory state.
 * @param {Action} action - The action to dispatch.
 */
function dispatch(action: Action) {
  memoryState = toastReducer(memoryState, action)
  for (const listener of listeners) {
    listener(memoryState)
  }
}

/**
 * The core toast function for creating or updating toasts.
 * @param {Omit<ToasterToast, "id">} props - The properties for the toast.
 * @returns {{ id: string, dismiss: () => void, update: (props: ToasterToast) => void }} An object with the toast's ID and functions to dismiss or update it.
 */
function toast(props: Omit<ToasterToast, "id">) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * The main hook for accessing the toast functionality.
 * It provides the current list of toasts.
 * @returns {{ toasts: ToasterToast[], toast: typeof toast, dismiss: (toastId?: string) => void }} An object with the toasts array and toast management functions.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
