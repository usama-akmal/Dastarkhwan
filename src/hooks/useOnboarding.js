import { useState } from 'react';
import { useSettings } from './useDatabase';
import { updateSettings } from '../data/db';

export function useOnboarding() {
  const { settings, loading } = useSettings();
  const [currentStep, setCurrentStep] = useState(0);
  
  const totalSteps = 4; // Welcome, Family, Rating, Dietary
  const isComplete = settings?.onboardingComplete || false;
  
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  const completeOnboarding = async () => {
    await updateSettings({ onboardingComplete: true });
  };
  
  return { currentStep, totalSteps, isComplete, loading, nextStep, prevStep, completeOnboarding, setCurrentStep };
}
