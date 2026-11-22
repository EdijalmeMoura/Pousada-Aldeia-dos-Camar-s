/** Decisão de rota sem efeitos, testável sem browser. */
export function authDestination(authenticated: boolean, onboardingComplete: boolean | undefined, onOnboarding: boolean): string | null {
  if (!authenticated) return "/login"
  if (onOnboarding && onboardingComplete) return "/app"
  if (!onOnboarding && onboardingComplete === false) return "/onboarding"
  return null
}
