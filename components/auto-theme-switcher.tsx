"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

const MANUAL_OVERRIDE_KEY = "ionos-mailer-theme-manual-override"

/**
 * Automatically switches between light and dark mode based on the user's local time.
 * - 7:00 AM - 17:00 (5 PM): Light Mode
 * - 17:00 - 7:00 AM: Dark Mode
 * 
 * User can manually override this preference. If they do, the auto-switch is paused
 * until the next "time boundary" (7am or 5pm) or page refresh.
 */
export function AutoThemeSwitcher() {
    const { setTheme, theme } = useTheme()
    useEffect(() => {
        const checkTimeAndSetTheme = () => {
            // Check if user has manually overridden this session - DIRECTLY
            // detailed: We check this on every tick because the storage might have changed
            // by the ThemeToggle component, and we need to respect it immediately.
            const override = sessionStorage.getItem(MANUAL_OVERRIDE_KEY)
            const now = new Date();
            const hour = now.getHours();

            // 7:00 (7am) to 16:59 (5pm) -> Light
            const isDayTime = hour >= 7 && hour < 17;
            const targetTheme = isDayTime ? 'light' : 'dark';

            if (override) {
                const overrideTime = parseInt(override, 10);
                // Check if we crossed a boundary since the override
                const todayBoundaries = [
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0).getTime(),  // 7:00
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0).getTime()  // 17:00
                ];

                let boundaryCrossed = false;
                for (const boundary of todayBoundaries) {
                    // If override was before boundary, and now is after boundary
                    if (overrideTime < boundary && now.getTime() >= boundary) {
                        boundaryCrossed = true;
                        break;
                    }
                }

                if (boundaryCrossed) {
                    // Clear override and let schedule take over
                    // console.log("Theme schedule boundary crossed. Clearing manual override.");
                    sessionStorage.removeItem(MANUAL_OVERRIDE_KEY);
                } else {
                    // Respect override
                    return;
                }
            }

            // Apply scheduled theme
            if (theme !== targetTheme) {
                setTheme(targetTheme);
            }
        };

        // Check immediately on mount
        checkTimeAndSetTheme();

        // Check every minute to handle the transition (e.g. while app is open)
        const interval = setInterval(checkTimeAndSetTheme, 60000);

        return () => clearInterval(interval);
    }, [setTheme, theme]);

    // Render nothing
    return null;
}
