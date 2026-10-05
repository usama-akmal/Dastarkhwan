import React from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import WelcomeStep from './WelcomeStep';
import FamilyStep from './FamilyStep';
import RatingStep from './RatingStep';
import DietaryStep from './DietaryStep';
import OnboardingProgress from './OnboardingProgress';
import { Icon } from '../ui/Icon';

const STEP_LABELS = ['Welcome', 'Your family', 'Their tastes', 'Dietary rules'];

const OnboardingWizard = () => {
  const { currentStep, totalSteps, nextStep, prevStep, completeOnboarding } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep onNext={nextStep} />;
      case 1: return <FamilyStep onNext={nextStep} />;
      case 2: return <RatingStep onComplete={nextStep} />;
      case 3: return <DietaryStep onComplete={completeOnboarding} />;
      default: return null;
    }
  };

  // The welcome screen has its own full-height layout and call to action.
  const isWelcome = currentStep === 0;

  return (
    <div className="onboarding">
      <div className="onboarding__inner">
        {!isWelcome && (
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            labels={STEP_LABELS}
          />
        )}

        <div style={{ flex: 1 }} className="animate-fade-in">
          {renderStep()}
        </div>

        {/* FamilyStep owns its own Continue (it is disabled until a member exists);
            every other step provides its own primary action too, so the wizard only
            needs a Back control. */}
        {currentStep > 1 && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <button type="button" id="onboarding-back" className="btn btn-ghost" onClick={prevStep}>
              <Icon name="arrowLeft" size={16} /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
