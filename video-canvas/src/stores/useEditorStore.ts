import { create } from 'zustand';
import { DrawingObject } from '../lib/models/drawing';

export type ToolType = 'select' | 'rect' | 'circle' | 'arrow' | 'line' | 'highlight' | 'spotlight' | 'connector';

export interface ObjectProperties {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDashArray: number[] | null;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

interface EditorState {
  // --- Data Model (Reactive) ---
  objects: DrawingObject[];
  activeTool: ToolType;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  globalProperties: ObjectProperties;
  
  // --- History (Reactive Model-based) ---
  history: DrawingObject[][];
  historyIndex: number;
  
  // --- Actions ---
  setTool: (tool: ToolType) => void;
  setSelectedObject: (id: string | null) => void;
  setHoveredObject: (id: string | null) => void;
  setObjects: (objects: DrawingObject[]) => void;
  
  // Model Mutations
  addObject: (obj: DrawingObject) => void;
  updateObject: (id: string, props: Partial<DrawingObject>) => void;
  removeObject: (id: string) => void;
  updateGlobalProperties: (props: Partial<ObjectProperties>) => void;
  
  // Reordering
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  
  // History Actions
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  objects: [],
  activeTool: 'select',
  selectedObjectId: null,
  hoveredObjectId: null,
  globalProperties: {
    fill: '#ff000033',
    stroke: '#ff0000',
    strokeWidth: 2,
    strokeDashArray: null,
    opacity: 1,
    visible: true,
    locked: false,
  },
  history: [],
  historyIndex: -1,

  setTool: (tool) => set({ activeTool: tool }),
  setSelectedObject: (id) => set({ selectedObjectId: id }),
  setHoveredObject: (id) => set({ hoveredObjectId: id }),
  setObjects: (objects) => set({ objects }),

  addObject: (obj) => {
    set((state) => ({ objects: [...state.objects, obj] }));
    get().saveHistory();
  },

  updateObject: (id, props) => {
    set((state) => ({
      objects: state.objects.map((obj) => 
        obj.id === id ? { ...obj, ...props } : obj
      ),
    }));
    // Note: We might want to throttle saveHistory for frequent updates like dragging
  },

  removeObject: (id) => {
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    }));
    get().saveHistory();
  },

  updateGlobalProperties: (props) => {
    set((state) => ({
      globalProperties: { ...state.globalProperties, ...props }
    }));
    
    // If an object is selected, update it too (Figma style)
    const { selectedObjectId } = get();
    if (selectedObjectId) {
      get().updateObject(selectedObjectId, props as any);
      get().saveHistory();
    }
  },

  bringToFront: (id) => {
    set((state) => {
      const index = state.objects.findIndex((o) => o.id === id);
      if (index === -1) return state;
      const newObjects = [...state.objects];
      const [item] = newObjects.splice(index, 1);
      newObjects.push(item);
      return { objects: newObjects };
    });
    get().saveHistory();
  },

  sendToBack: (id) => {
    set((state) => {
      const index = state.objects.findIndex((o) => o.id === id);
      if (index === -1) return state;
      const newObjects = [...state.objects];
      const [item] = newObjects.splice(index, 1);
      newObjects.unshift(item);
      return { objects: newObjects };
    });
    get().saveHistory();
  },

  bringForward: (id) => {
    set((state) => {
      const index = state.objects.findIndex((o) => o.id === id);
      if (index === -1 || index === state.objects.length - 1) return state;
      const newObjects = [...state.objects];
      [newObjects[index], newObjects[index + 1]] = [newObjects[index + 1], newObjects[index]];
      return { objects: newObjects };
    });
    get().saveHistory();
  },

  sendBackward: (id) => {
    set((state) => {
      const index = state.objects.findIndex((o) => o.id === id);
      if (index === -1 || index === 0) return state;
      const newObjects = [...state.objects];
      [newObjects[index], newObjects[index - 1]] = [newObjects[index - 1], newObjects[index]];
      return { objects: newObjects };
    });
    get().saveHistory();
  },

  saveHistory: () => {
    const { objects, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Simple deep equal check to avoid redundant history
    if (newHistory.length > 0 && JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(objects)) {
      return;
    }
    
    newHistory.push([...objects]);
    if (newHistory.length > 50) newHistory.shift();
    
    set({ 
      history: newHistory, 
      historyIndex: newHistory.length - 1 
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    set({ 
      objects: [...history[newIndex]],
      historyIndex: newIndex 
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    set({ 
      objects: [...history[newIndex]],
      historyIndex: newIndex 
    });
  },
}));
