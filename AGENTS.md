# AGENTS.md

This document outlines the technical architecture, key libraries, and development methodology for the Vite React PWA Local Music Player.

## Technical Architecture

-   **Framework**: React (Vite)
-   **Architecture**: Progressive Web Application (PWA) to ensure it's installable on user devices, providing an app-like experience.
-   **State Management/Data**:
    -   **IndexedDB**: We will use IndexedDB to store the metadata of the user's local music files. This provides a persistent and queryable client-side database suitable for storing structured data. We will use the `Dexie.js` wrapper library to simplify IndexedDB operations.
    -   **File System Access API**: To provide a modern and user-friendly way for users to grant access to their local music directories. A fallback using the standard `<input type="file">` will be considered for browsers that do not support this API.
-   **Deployment**: The application will be deployed to GitHub Pages.
-   **CI/CD**: A GitHub Action will be configured to automatically build the application and deploy it to the `gh-pages` branch upon pushes to the `main` branch.

## Key Libraries

-   **PWA Configuration**: `vite-plugin-pwa` - A zero-config Vite plugin for PWA integration.
-   **ID3 Tag Reading**: `jsmediatags` - A library to read metadata (ID3 tags) from media files in the browser.
-   **Fuzzy Search**: `fuse.js` - A powerful, lightweight fuzzy-search library with zero dependencies.
-   **Client-Side Database**: `dexie` - A minimalistic wrapper for IndexedDB to make it more developer-friendly.
-   **UI Testing**: `@testing-library/react` and `@testing-library/jest-dom` for component-level integration tests.
-   **Test Runner**: `vitest` - A Vite-native unit test framework.
-   **End-to-End Testing**: `playwright` may be introduced later for comprehensive end-to-end testing of the application flow.

## Test-Driven Development (TDD) Workflow

This project strictly follows a Test-Driven Development (TDD) methodology. All new features must begin with a failing test.

The development cycle is as follows:

1.  **Red**: Write a new test that describes a feature or a piece of functionality. This test should fail because the corresponding code has not been implemented yet.
2.  **Green**: Write the simplest, most minimal code possible to make the failing test pass. At this stage, the focus is on getting to a green state, not on writing perfect code.
3.  **Refactor**: Once the test is passing, refactor the implementation code to improve its design, readability, and performance without changing its external behavior. The test suite ensures that the refactoring does not introduce any regressions.

All tests should be small and focused on a single piece of behavior. This workflow ensures our codebase is robust, well-tested, and easy to maintain.
