import { Button } from "../../../components/ui/button";
import { useOnboarding } from "../onboarding-context";
import { OnboardingLayout } from "../onboarding-shell";

export function OnboardingWelcomeStep() {
  const { actions } = useOnboarding();

  return (
    <OnboardingLayout.StepBody>
      <OnboardingLayout.Actions
        primary={
          <Button className="w-full" size="lg" shape="square" variant="primary" onClick={actions.continue}>
            Get Started
          </Button>
        }
      />
    </OnboardingLayout.StepBody>
  );
}
