# Design Document (DESIGN_DOC)

## 🏗 Architecture & Component Structure
- Which components will be created/modified?
- Is there a component exceeding 200 lines that needs splitting?

## 💾 State Management
- **Zustand**: What states need to be global?
- **TanStack Query**: How will the data sync with IndexedDB?

## 🔄 Data Flow
- Provide a sequence of events for the new feature (e.g. User clicks -> Zustand updates -> Action Bridge triggers -> IDB saves).

## 🛡️ Validation & Types
- Detail the Zod schema validations for any new payloads.
