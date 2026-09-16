import React from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import WelcomeStep from './WelcomeStep';
import FamilyStep from './FamilyStep';
import RatingStep from './RatingStep';
import DietaryStep from './DietaryStep';

const OnboardingWizard = () => {
  const { currentStep, totalSteps, nextStep, prevStep, completeOnboarding } = useOnboarding();

  const handleComplete = async () => {
    await completeOnboarding();
    // App.jsx will detect onboardingComplete and switch to main app
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep onNext={nextStep} />;
      case 1: return <FamilyStep onNext={nextStep} />;
      case 2: return <RatingStep onComplete={nextStep} />;
      case 3: return <DietaryStep onComplete={handleComplete} />;
      default: return null;
    }
  };

  const showBackButton = currentStep > 0;
  const showNextButton = currentStep === 1; // Only FamilyStep uses external Next

  return (
    <div style={styles.container}>
      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressTrack}>
          <div style={{
            ...styles.progressFill,
            width: `${(currentStep / (totalSteps - 1)) * 100}%`
          }} />
        </div>
        <div style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                ...(i <= currentStep ? styles.dotActive : styles.dotInactive),
                ...(i === currentStep ? styles.dotCurrent : {})
              }}
            >
              {i < currentStep && <span style={{ fontSize: '10px' }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={styles.stepLabel}>
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content} className="animate-fade-in">
        {renderStep()}
      </div>

      {/* Footer Navigation */}
      <div style={styles.footer}>
        {showBackButton ? (
          <button
            id="onboarding-back"
            className="btn btn-ghost"
            onClick={prevStep}
            style={styles.backButton}
          >
            ← Back
          </button>
        ) : <div />}

        {showNextButton && (
          <button
            id="onboarding-next"
            className="btn btn-primary"
            onClick={nextStep}
            style={styles.nextButton}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-body)',
  },
  progressContainer: {
    padding: '24px 24px 0',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
  },
  progressTrack: {
    width: '100%',
    height: '3px',
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '2px',
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dotsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: '-10px',
    marginBottom: '8px',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
    fontSize: '10px',
  },
  dotActive: {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: 'var(--color-bg-primary)',
    boxShadow: '0 0 12px rgba(240, 165, 32, 0.4)',
  },
  dotInactive: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderColor: 'var(--color-bg-elevated)',
  },
  dotCurrent: {
    transform: 'scale(1.3)',
    boxShadow: '0 0 16px rgba(240, 165, 32, 0.5)',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
  content: {
    flex: 1,
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
    padding: '16px 24px',
    overflowY: 'auto',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px 32px',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
    background: 'linear-gradient(to top, var(--color-bg-primary) 60%, transparent)',
  },
  backButton: {
    fontSize: '0.9rem',
  },
  nextButton: {
    padding: '10px 28px',
    borderRadius: '24px',
    fontSize: '0.95rem',
    fontWeight: '600',
  }
};

export default OnboardingWizard;
