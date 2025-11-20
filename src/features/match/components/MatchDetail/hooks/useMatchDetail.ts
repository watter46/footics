import { useState } from 'react';
import { useMatchDetailLogic } from './useMatchDetailLogic';

export const useMatchDetail = (matchId: number) => {
  const matchDetailState = useMatchDetailLogic(matchId);

  // UI State
  const [tempSlotIdMap, setTempSlotIdMap] = useState(new Map<number, string>());
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('record');

  return {
    ...matchDetailState,
    tempSlotIdMap,
    setTempSlotIdMap,
    isEditSheetOpen,
    setIsEditSheetOpen,
    activeTab,
    setActiveTab,
  };
};
