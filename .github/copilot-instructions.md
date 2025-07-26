<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions for Next.js Project

This is a Next.js project with the following stack:
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Libraries**: Material-UI (MUI) + shadcn/ui
- **Icons**: Radix UI Icons
- **Linting**: ESLint with Next.js configuration
- **Directory Structure**: src/ directory organization

## Code Style Guidelines
- Use TypeScript for all components and utilities
- Follow React functional component patterns with hooks
- Use Tailwind CSS for styling (avoid inline styles when possible)
- Combine MUI and shadcn/ui components as needed
- Use shadcn/ui for modern design system components
- Use MUI for complex data display and layout components
- Implement proper error boundaries and loading states
- Follow Next.js App Router conventions for routing and layout

## UI Component Usage
- **shadcn/ui**: Use for buttons, cards, dialogs, forms, and modern UI elements
- **Material-UI**: Use for data tables, complex layouts, navigation, and advanced components
- **Theme**: Dark theme is configured for both libraries
- **Icons**: Use Radix UI icons for consistency with shadcn/ui

## Project Structure
- Components should be placed in `src/components/`
- UI components from shadcn/ui are in `src/components/ui/`
- Pages follow App Router structure in `src/app/`
- Utilities and helpers in `src/lib/`
- Custom hooks in `src/hooks/`
- Types and interfaces in `src/types/`
- MUI theme configuration in `src/lib/mui-theme.ts`

## Best Practices
- Use Server Components by default, Client Components when interactivity is needed
- Implement proper SEO with metadata API
- Use Next.js Image component for optimized images
- Follow accessibility (a11y) standards
- Implement proper error handling and loading states
- When using MUI components, wrap them in 'use client' components if needed
- Combine Tailwind classes with MUI theme for consistent styling
