import React from 'react';
import { Workspace } from './components/features/editor/Workspace';

const EditorApp: React.FC = () => {
  return (
    <div className="w-full h-screen overflow-hidden">
      <Workspace />
    </div>
  );
};

export default EditorApp;
