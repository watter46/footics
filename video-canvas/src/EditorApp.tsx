import type React from 'react';
import { useEffect } from 'react';
import { Workspace } from './components/features/editor/Workspace';
import { Loading } from './components/ui/Loading';
import { useEditorStore } from './stores/useEditorStore';

export const EditorApp: React.FC = () => {
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const hydrateFromStorage = useEditorStore(
    (state) => state.hydrateFromStorage,
  );

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  if (!isHydrated) {
    return <Loading />;
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <Workspace />
    </div>
  );
};
