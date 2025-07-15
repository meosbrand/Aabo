import * as React from "react"

// Defines the breakpoint for mobile devices.
const MOBILE_BREAKPOINT = 768

/**
 * A custom React hook to determine if the current viewport is a mobile device.
 * It uses a media query to check the window width and updates on resize.
 *
 * @returns {boolean} `true` if the viewport width is less than the mobile breakpoint, otherwise `false`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create a media query list object
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Function to update state based on the media query match
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add listener for changes in the media query
    mql.addEventListener("change", onChange)
    
    // Set the initial state on component mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup function to remove the listener when the component unmounts.
    return () => {
      mql.removeEventListener("change", onChange)
    }
  }, []) // Empty dependency array ensures this effect runs only once on mount and cleanup on unmount.

  return isMobile
}
