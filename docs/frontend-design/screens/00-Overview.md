# CheckFlow Screens Overview

## Screen Structure
CheckFlow follows a consistent layout pattern with two main types of screens:

### Public Screens
- **Login Screen**: No sidebar, full-screen authentication interface

### Protected Screens (Authenticated Users)
- **All protected routes include the sidebar component** as specified in `components/Sidebar-Component.md`
- **Page content descriptions focus on the main content area only**
- **Sidebar provides consistent navigation, branding, and user account management across all screens**

## Screen List

### Authentication
- **Login Screen** (`/login`) - Google OAuth authentication via Supabase
- **Layout**: Full-screen, no sidebar

### Protected Application Screens
*All screens below include the sidebar component and focus descriptions on main content area only*

- **Order Review** (`/review`) - Main interface for reviewing designs  
- **Sheet Management** (`/sheets`) - Configure and manage Google Sheets integration
- **Reports** (`/reports`) - Analytics and performance reports

## Common Elements

### Public Screens (Login)
- Full-screen layout
- No sidebar or navigation
- Centered authentication interface

### Protected Screens (All authenticated routes)
- **Sidebar Component**: Consistent across all protected routes
  - App branding and navigation
  - User profile and logout functionality
  - Collapsible/expandable design
  - See `components/Sidebar-Component.md` for complete specification
- **Main Content Area**: Screen-specific content and functionality
- **Responsive Layout**: Adapts to different screen sizes

### Authentication Flow
1. **Login Screen**: Supabase Auth with Google OAuth (no sidebar)
2. **Protected Routes**: All authenticated screens include sidebar component
3. **Navigation**: Sidebar provides access to all main application sections
4. **User Account**: Sidebar manages user profile and logout functionality

## Layout Architecture

### Login Screen
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                  Full Screen Layout                     │
│                Authentication Interface                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
\`\`\`

### Protected Screens
\`\`\`
┌─────────────────────────────────────────────────────────┐
│ Sidebar │ Main Content Area                             │
│         │                                               │
│ - Logo  │ Screen-specific content and functionality     │
│ - Nav   │                                               │
│ - User  │                                               │
│         │                                               │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Screen Documentation Guidelines

### For Screen Specifications
- **Focus on main content area only** - sidebar is handled separately
- **Describe screen-specific functionality** and user interactions
- **Include wireframes for main content** without sidebar details
- **Reference sidebar component** when navigation context is relevant

### Sidebar Integration
- All protected routes automatically include the sidebar component
- Sidebar handles navigation, user account, and branding consistently
- Screen specifications should assume sidebar presence
- No need to duplicate sidebar functionality in individual screen docs
