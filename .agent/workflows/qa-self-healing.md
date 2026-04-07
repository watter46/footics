---
description: Run automated QA tests via browser subagent and self-heal on failure
---
# QA Self-Healing Workflow

// turbo-all
1. Identify the port needed (`pnpm run dev` typically uses 3000). Start the development server using `run_command` in a persistent or background terminal. 
2. Wait briefly until the dev server is ready.
3. Open a `browser_subagent` to navigate to the locally hosted application page and perform the required UI tests.
4. If the subagent reports a UI error (components not rendering, interactions failing, console errors), fetch logs and capture screenshots if necessary.
5. Fix the code causing the bug autonomously.
6. Trigger the `browser_subagent` again to verify the fix.
7. Terminate the background development server.
