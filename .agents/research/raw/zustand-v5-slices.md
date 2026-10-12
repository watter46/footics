# Zustand v5 Slice Pattern

### Core Concept
The "slice pattern" in Zustand is a convention for managing large stores by breaking them down into smaller, modular, and feature-focused functions (slices) rather than keeping all state and actions in one monolithic `create` block.

### Implementation Pattern
Each slice is defined as a function that accepts `set`, `get`, and `api` as arguments. You then combine them within the main `create` function.

```typescript
import { StateCreator } from 'zustand';

// Define the interface for this slice
export interface BearSlice {
  bears: number;
  addBear: () => void;
}

// Implement the slice using StateCreator
// Note: StateCreator type parameters usually include the full Store type
export const createBearSlice: StateCreator<BearSlice> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
});

// Another slice
export interface FishSlice {
  fishes: number;
  addFish: () => void;
}
export const createFishSlice: StateCreator<FishSlice> = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
});
```

### Composing into a single store
```typescript
import { create } from 'zustand';

// Combine all slice interfaces
export type BoundStore = BearSlice & FishSlice;

// Create the combined store
export const useBoundStore = create<BoundStore>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));
```

### Key Considerations
*   **Single Store:** Even when using slices, you are still creating a single, module-level store. The slices are simply spread into that one store.
*   **Cross-Slice Access:** Because they are composed into one store, slices can interact with each other. If one slice needs to read state or call an action from another, it can use the `get()` function to access the current state of the entire store.
*   **Middleware:** It is best practice to apply middlewares (like `persist`, `devtools`, or `immer`) at the **combined store level** rather than within individual slices to avoid unexpected behavior.
