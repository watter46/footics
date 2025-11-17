# GitHub Copilot Instructions for React and Next.js Projects

This file provides guidelines for GitHub Copilot to ensure consistent, clean, and performant code generation for React and Next.js applications.

## General Principles

- **Clean Code:** Prioritize **readability, maintainability, and reusability**.
- **Conciseness:** Aim for concise and expressive code.
- **Descriptive Naming:** Use clear and descriptive names for variables, functions, components, and files (e.g., `getUserProfile`, `ProductCard`, `useAuth`).
- **DRY (Don't Repeat Yourself):** Extract reusable logic into functions, custom hooks, or components.
- **Modularization:** Break down complex problems and features into smaller, manageable units (components, functions, utilities).
- **TypeScript First:** All new code should be written in **TypeScript**, leveraging its type safety features.
- **Testable Code:** Design code to be easily testable.
- **Package Management:** This project uses **pnpm** for managing dependencies. All package installations and scripts should use `pnpm` instead of `npm` or `yarn`.
- **Documentation:** All principal documentation should be created in the `docs` folder.

### General Guidelines

- **Co-locate logic that change together**
- **Group code by feature, not by type**
- **Separate UI, logic, and data fetching**
- **Typesafety across the whole stack – db-server-client. If a type changes, everywhere using it should be aware.**
- **Clear product logic vs product infrastructure separation**
- **Design code such that it is easy to replace and delete**
- **Minimize places/number of changes to extend features**
- **Functions / APIs should do one thing well. One level of abstraction per function**
- **Minimize API interface and expose only what's necessary**
- **Favor pure functions, it makes logic easy to test**
- **Long, clear names over short, vague names, even at the cost of verbosity**
- **Resource Usage:** Run memory-intensive commands (e.g., pint, build) only against the impacted scope.

### Robust Error Handling

- **Mandatory `try...catch`:** All `async/await` operations must be wrapped in a `try...catch` block to handle potential errors gracefully (e.g., user feedback, logging).
- **Promise Rejection Handling:** When using `.then()`, a `.catch()` block for error handling is mandatory.
- **API Response Validation:** Always validate data fetched from external APIs (e.g., using type guards or libraries like Zod) before trusting and using it in the application.

---

## React Specific Guidelines

### Component Design

- **Functional Components & Hooks:** Prefer **functional components with React Hooks**. Avoid class components unless explicitly for error boundaries.
- **Single Responsibility:** Each component should ideally have one primary responsibility. **Components must be kept small and focused.**
- **Signs of Complexity:** If a component requires multiple state variables (`useState`), side effects (`useEffect`), or internal helper functions, it is considered complex.
- **Default Action:** Complex components **must** be refactored by default. Separate UI (JSX) into the component file (e.g., `index.tsx`) and logic into custom hooks (e.g., `hooks/useMyComponent.ts`).
- **Component Naming:** Use `PascalCase` for all component names (e.g., `MyButton`, `UserAvatar`).
- **Component File Naming:** Component file names should also use `PascalCase` (e.g., `MyButton.tsx`), *except* when following the Feature-Specific `index.tsx` convention (see Project Structure).
- **Component Reusability:** When creating components, always check other files in the codebase to identify opportunities for creating reusable generic components. Extract common patterns into shared components.
- **Props:**
  - Use `camelCase` for prop names.
  - Destructure props in the component's function signature.
  - Provide clear `interface` or `type` definitions for props in TypeScript.
- **Immutability:** Never mutate props or state directly. Always create new objects or arrays for updates.
- **Fragments:** Use `<>...</>` or `React.Fragment` to avoid unnecessary DOM wrapper elements.
- **Custom Hooks:** Extract reusable stateful logic into **custom hooks** (e.g., `useDebounce`, `useLocalStorage`).
- **UI Components:** Use [shadcn/ui](https://ui.shadcn.com/) for building UI components to ensure consistency and accessibility.

## UI Theme Guidelines

- The color scheme is based on "dark (background + UI) with bright accents," ensuring sufficient color contrast. The UI is simple and makes good use of whitespace, utilizing modern shadcn/ui components. Information hierarchy and visibility are emphasized, and event types and states are intuitively distinguished by color and icon. Hover effects and animations are kept subtle to maintain a clean and sporty impression. For the MVP, only the dark theme is supported; the light theme will be considered in the future.

### State Management

- **Local State:** Use `useState` for component-level state.
- **Global State:** For global or shared state, prefer **React Context API** or a dedicated state management library (e.g., Zustand, Redux, Jotai). Avoid prop drilling.

### Styling

- **Consistent Approach:** use Tailwind CSS v4 ou later.
- **Scoped Styles:** Ensure styles are scoped to avoid global conflicts.

### Performance

- **Keys:** Always provide a unique and stable `key` prop when mapping over lists. Do not use array `index` as a key if the list can change.
- **Lazy Loading:** Suggest `React.lazy` and `Suspense` for code splitting large components or routes.

---

## Next.js Specific Guidelines

### Data Fetching & Rendering

- **App Router Preference:** Use the **App Router** for new development.
- **Server Components:** Prioritize fetching data in **Server Components** (`async` components in `app` directory) for better performance and security. This is where a lot of the traditional memoization benefits are handled automatically.
- **Data Fetching Methods:**
  - For build-time data or rarely changing content, suggest `getStaticProps` (Pages Router) or direct `fetch` in Server Components with `revalidate` (App Router).
  - For dynamic, frequently changing data, suggest `getServerSideProps` (Pages Router) or direct `fetch` in Server Components (App Router).
  - Avoid client-side data fetching for inidial page loads unless absolutely necessary (e.g., user-specific data after hydration).
- **Parallel Fetching:** When fetching multiple independent data sources, initiate requests in parallel.

### Routing

- **File-System Routing:** Use Next.js's App Route file-system convention.
- **Route Groups:** Utilize `(folderName)` to organize routes without affecting the URL path.
- **Dynamic Routes:** Define dynamic segments clearly (e.g., `[slug]`).
- **Middleware:** Suggest using `middleware.ts` for authentication, authorization, or other global request handling.

### Optimization

- **Image Optimization:** Always use `next/image` component for images.
- **Font Optimization:** Use `next/font` for optimizing fonts.
- **Dynamic Imports:** Use `next/dynamic` for lazy loading components to reduce initial bundle size.

### Security

- **Prevent Secret Exposure:** **Never** reference sensitive environment variables (e.g., `process.env.API_KEY`) directly in Client Components (`'use client'` files). Sensitive keys must only be accessed in Server Components or Route Handlers.
- **Secure API Routes:** All API Routes (Route Handlers) should implement authentication and authorization checks by default. Always validate input data for `POST`, `PUT`, or `PATCH` requests.

### Project Structure

- **Component Placement Rules:** Strictly follow these rules based on reusability and scope.
  - **A. Feature-Specific Components (Priority 1):**
    - **Default Structure:** This directory structure is the default for **all** new feature-specific components, even if they start small.
    - **Mandatory Separation (UI):** The `index.tsx` file **must** contain only the UI (JSX) and presentation logic.
    - **Mandatory Separation (Logic):** All state (`useState`), effects (`useEffect`), callbacks (`useCallback`), and business logic **must** be extracted into component-specific hooks. (See Hook Placement Rule A).
    - **Sub-Component Separation:** Any smaller components defined *within* `index.tsx` (e.g., `function MyListItem() {}`) **should be** actively split into their own files (e.g., `.../[ComponentName]/components/MyListItem.tsx`).
    - **Location:** `src/features/[feature-name]/components/[ComponentName]/index.tsx`
    - **Example Structure:**
      ```
      /RecordTab/
      ├── index.tsx         # (UI / JSX Only)
      ├── hooks/
      │   └── useRecordTab.ts # (All Logic / State / Effects)
      └── components/
          └── RecordItem.tsx  # (Sub-component)
      ```
  - **B. Global UI Components (Priority 2):**
    - **Condition:** Generic, feature-agnostic components used project-wide (e.g., `Button`, `Input`).
    - **Location:** `src/components/ui/[ComponentName].tsx` (or `/index.tsx` if it has related files like hooks).

- **Custom Hook Placement Rules:** Always colocate hooks at the smallest possible scope (highest proximity).
  - **A. Component-Specific Hooks (Priority 1):**
    - **Condition:** Internal logic used by *only one* component.
    - **Location:** Inside the component's directory: `src/features/[feature-name]/components/[ComponentName]/hooks/useMyHook.ts`
  - **B. Feature-Wide Hooks (Priority 2):**
    - **Condition:** Logic shared by *multiple* components within the same feature.
    - **Location:** At the feature's root hooks folder: `src/features/[feature-name]/hooks/useFeatureData.ts`
  - **C. Global Hooks (Priority 3):**
    - **Condition:** Generic, reusable logic used project-wide (e.g., `useWindowSize`).
    - **Location:** `src/hooks/`

- **Utility & Helper Modules:**
  - All general utility functions (non-React, pure functions) should be placed in `src/lib/` (e.g., `src/lib/utils/`).
  - *Note: Global React Hooks belong in `src/hooks/`, not `src/lib/`.*

- **Private Folders:**
  - Use underscore-prefixed folders (e.g., `_lib`, `_components`) for internal, non-route-related files.

- **No Barrel Files:**
  - Do not use barrel files (e.g., `index.ts` that *only* re-exports from other files) for module exports. Always import directly from the specific file.
  - *(Note: Using `index.tsx` as the main file for a component, e.g., `.../MyComponent/index.tsx`, is permitted and is **not** considered a barrel file.)*

### SEO & Accessibility

- **Metadata:** Use `generateMetadata` (App Router) or `next/head` (Pages Router) for SEO metadata.
- **Accessibility:** Emphasize semantic HTML, ARIA attributes, and keyboard navigation.

### TypeScript

- **Strict Mode:** Ensure `strict: true` is enabled in `tsconfig.json`.
- **Type Definitions:** Provide accurate type definitions for API responses, props, and state.
- **Type Organization:**
  **Shared types** (e.g., API responses, DB schemas, types used across multiple features) **must be placed in the `types/` folder** with a descriptive filename (e.g., `user.ts`, `post.ts`). Component-specific `Props` or `State` types may be defined within their respective component `.tsx` file for convenience and colocation.

---

## Communication Guidelines

- **Output Language:** Always respond to the user in **Japanese** during chat interactions, regardless of the language used in the codebase or documentation.

---

## Example of How Copilot Should Respond

- **Given:** `// Create a simple React functional component for a button.`
- **Expected Output:** A functional component using `PascalCase`, with a `React.FC` type, props destructuring, and appropriate event handlers, kept as concise as possible.
- **Given:** `// Implement a Next.js API route to fetch products.`
- **Expected Output:** A route handler (or API route in `pages/api`) that demonstrates server-side data fetching, proper error handling, and potentially uses server-only context for sensitive operations. Any complex data transformation should be suggested in a separate utility function.
- **Given:** `// Refactor this component to use a custom hook for form validation.`
- **Expected Output:** A new file for a `useForm` hook, and the original component updated to utilize the hook. Any specific validation logic should be suggested in a helper function within `utils/validation.ts`.

### Quality Assurance & Task Completion

- **Linting (`pnpm lint`):** All generated code **must** strictly adhere to the project's ESLint rules (defined in `eslint.config.mjs`). Avoid generating code that would produce linting errors, especially regarding imports, unused variables, and React hook dependencies.
- **Building (`pnpm build`):** All generated code **must** be type-safe and successfully build. Pay close attention to TypeScript rules (`tsconfig.json`) and Next.js specific requirements (e.g., Client/Server component boundaries).
- **Task Summary:** At the end of completing all requested tasks, provide a brief summary in Japanese explaining **what was changed and why** (e.g., "ロジックを `useRecordTab` フックに分離し、UIの責務を `index.tsx` に限定しました").
