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
  REMOVE_TOAST: "REMOVE_TOA<ctrl63>