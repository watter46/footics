# TASK-183: TacticalStoreProvider の初期プロジェクト ID 決定論化による Hydration Mismatch 解消

- **Status**: `DONE`
- **Commit**: `fix(tactical-unified): use deterministic IDs in createDefaultTacticalProject to prevent hydration mismatch`

## Negative Contracts
- `createDefaultTacticalProject()` 内に `crypto.randomUUID()` および `new Date().toISOString()` が残存しないこと（0件）。

---

### Phase 1: `createDefaultTacticalProject` の決定論化

### Target Files
- `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`[MODIFY]`)

### 1. `[MODIFY]` `src/features/tactical-unified/stores/tactical-store-provider.tsx`

#### Before
```tsx
export function createDefaultTacticalProject(): DomainTacticalProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    version: '3.0.0',
    title: 'Untitled Tactical Plan',
    createdAt: now,
    updatedAt: now,
    homeColor: { primary: '#034694' },
```

#### After
```tsx
export function createDefaultTacticalProject(): DomainTacticalProject {
  const now = '1970-01-01T00:00:00.000Z';
  return {
    id: 'default-project',
    version: '3.0.0',
    title: 'Untitled Tactical Plan',
    createdAt: now,
    updatedAt: now,
    homeColor: { primary: '#034694' },
```

#### Before
```tsx
    phases: [
      {
        id: crypto.randomUUID(),
        name: 'Phase 1',
        aspectRatio: '4:5',
```

#### After
```tsx
    phases: [
      {
        id: 'default-phase-1',
        name: 'Phase 1',
        aspectRatio: '4:5',
```

#### Before
```tsx
        slides: [
          {
            id: crypto.randomUUID(),
            index: 0,
            label: 'Scene 1',
```

#### After
```tsx
        slides: [
          {
            id: 'default-slide-1',
            index: 0,
            label: 'Scene 1',
```
