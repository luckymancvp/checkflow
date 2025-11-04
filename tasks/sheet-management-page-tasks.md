# Sheet Management Page Implementation Tasks

## Overview
Implement the `/sheets` page for Google Sheets integration management based on `docs/frontend-design/screens/07-Sheet-Management-Screen.md` and existing API endpoints.

## Task Breakdown

### Phase 1: Basic Page Structure & Layout

#### Task 1.1: Create Base Page Component
- [x] Create `app/sheets/page.tsx` with basic layout
- [x] Add page title "Sheet Management" 
- [x] Implement responsive container structure
- [x] Add loading states for initial page load
- [x] Test basic routing to `/sheets`

**Files to create/modify:**
- `app/sheets/page.tsx`

**Acceptance Criteria:**
- [x] Page renders without errors
- [x] Sidebar navigation works correctly
- [x] Page title displays properly
- [x] Responsive layout on mobile/desktop

#### Task 1.2: Header Section Implementation
- [x] Create header with "Sheet Management" title
- [x] Add [Check Access] button (placeholder for now)
- [x] Add [Add Sheet] button with icon
- [x] Style header according to design specs
- [x] Make header responsive

**Components needed:**
- Header with buttons
- Button components with icons

**Acceptance Criteria:**
- [x] Header displays correctly on all screen sizes
- [x] Buttons are properly styled and positioned
- [x] Icons display correctly

### Phase 2: Google Sheets Connection Status

#### Task 2.1: Connection Status Component
- [x] Create `GoogleSheetsConnectionStatus` component
- [x] Implement connection status display (Connected/Disconnected)
- [x] Add system account email display
- [x] Add [Reconnect] button functionality
- [x] Add "Last Token Refresh" timestamp
- [x] Style status indicators (● Connected, ⚠ Token Issue, etc.)

**API Integration:**
- Use `GET /api/auth/google-sheets-token` to check connection status
- Handle different connection states

**Files to create:**
- `components/google-sheets-connection-status.tsx`

**Acceptance Criteria:**
- [x] Shows correct connection status
- [x] Displays system account email when connected
- [x] Shows appropriate icons for different states
- [x] Reconnect button triggers OAuth flow

#### Task 2.2: Google Sheets OAuth Integration
- [x] Implement client-side Google OAuth flow
- [x] Create OAuth popup/redirect handling
- [x] Update tokens via `PUT /api/auth/google-sheets-token`
- [x] Handle OAuth success/error states
- [x] Add loading states during OAuth process

**Technical Requirements:**
- Use Google OAuth 2.0 client-side flow
- Handle token refresh automatically
- Store tokens securely via API

**Acceptance Criteria:**
- [x] OAuth flow completes successfully
- [x] Tokens are stored and updated correctly
- [x] Error handling for failed OAuth
- [x] Loading states during authentication

### Phase 3: Add Sheet Modal/Wizard (MOVED UP - PRIORITY)

#### Task 3.1: Add Sheet Modal Structure
- [ ] Create multi-step modal component
- [ ] Implement step navigation (Step 1-5)
- [ ] Add modal header with close button
- [ ] Create step indicator/progress bar
- [ ] Add [Cancel], [Back], [Next] button logic
- [ ] Handle modal open/close states

**Files to create:**
- `components/add-sheet-modal.tsx`
- `components/modal-step-indicator.tsx`

**Acceptance Criteria:**
- Modal opens/closes correctly
- Step navigation works properly
- Progress indicator shows current step
- Modal is responsive and accessible

#### Task 3.2: Step 1 - Basic Information & System Access
- [ ] Create form fields for sheet name and description
- [ ] Add Google Sheet URL input with validation
- [ ] Implement system access connection UI
- [ ] Add [Connect System Google Account] button
- [ ] Handle OAuth integration for system access
- [ ] Validate form inputs before proceeding

**Form Fields:**
- Sheet Name (required, max 100 chars)
- Description (optional)
- Google Sheet URL (required, URL validation)

**Acceptance Criteria:**
- Form validation works correctly
- Google OAuth integration functions
- Error messages display appropriately
- Cannot proceed without required fields

#### Task 3.3: Step 2 - Sheet Selection (Client-Side Loading)
- [ ] Implement Google Sheets API integration
- [ ] Load available sheet tabs from Google Sheets
- [ ] Display tab selection radio buttons
- [ ] Show sheet preview information (row count, headers)
- [ ] Add performance warnings for large sheets
- [ ] Handle API errors gracefully

**Google Sheets API Integration:**
- Use client-side Google Sheets API
- Fetch sheet metadata and tab information
- Handle authentication with stored tokens

**Acceptance Criteria:**
- Sheet tabs load correctly from Google API
- Row count and preview data displays
- Performance warnings show for large sheets
- Error handling for API failures

#### Task 3.4: Step 3 - Sync Strategy Configuration
- [ ] Create sync strategy selection UI
- [ ] Implement row-based sync option with input
- [ ] Implement date-based sync with dropdown options
- [ ] Add performance impact indicators
- [ ] Show estimated rows to sync
- [ ] Add recommendations and help text
- [ ] Set date-based as default selection

**Sync Options:**
- Row-based: Start from specific row number
- Date-based: Last N days (7, 14, 30, 60, 90, 180, all)

**Acceptance Criteria:**
- Both sync strategies are selectable
- Performance estimates are accurate
- Default selection is date-based (60 days)
- Help text explains each option clearly

#### Task 3.5: Step 4 - Data Range Configuration
- [ ] Implement header row selection
- [ ] Show calculated data range based on sync strategy
- [ ] Add data reading direction options
- [ ] Configure client-side processing limits
- [ ] Display performance preview
- [ ] Add caching and pagination options

**Configuration Options:**
- Header row selection
- Data reading direction (top-to-bottom/bottom-to-top)
- Max rows per load (performance setting)
- Caching and pagination settings

**Acceptance Criteria:**
- Data range calculates correctly
- Performance settings are configurable
- Preview information is accurate
- Settings affect performance estimates

#### Task 3.6: Step 5 - Column Mapping (Auto-detect)
- [ ] Implement Google Sheets header detection
- [ ] Create auto-mapping logic for common field names
- [ ] Display detected headers in grid layout
- [ ] Show field mapping dropdowns with auto-selection
- [ ] Add sample data preview for each field
- [ ] Implement status value mapping
- [ ] Add date format validation
- [ ] Show field type configuration

**Auto-mapping Fields:**
- Item ID, Status, Order Note, Designer
- Design, Customer Image, Personalization
- Date, Store, Image, Product Type, Product Name

**Acceptance Criteria:**
- Headers are detected automatically
- Auto-mapping works for standard field names
- Sample data displays correctly
- Field validation works properly
- Status values are mapped correctly

### Phase 4: Sheet List Display (MOVED DOWN - AFTER ADD FUNCTIONALITY)

#### Task 4.1: Sheet List Component
- [ ] Create `SheetList` component
- [ ] Implement sheet card layout design
- [ ] Add sheet status indicators (Active, Warning, Error)
- [ ] Display sheet configuration details
- [ ] Add creator information with avatar
- [ ] Implement [Edit] and [Delete] buttons
- [ ] Add [Open in New Tab] functionality

**API Integration:**
- Use `GET /api/sheets` to fetch sheet configurations
- Handle loading and error states

**Files to create:**
- `components/sheet-list.tsx`
- `components/sheet-card.tsx`

**Acceptance Criteria:**
- All sheet information displays correctly
- Status indicators show appropriate colors/icons
- Creator avatars and info display properly
- Action buttons are functional

#### Task 4.2: Sheet Card Details Implementation
- [ ] Implement sheet name and description display
- [ ] Add sync strategy information (Row-based/Date-based)
- [ ] Show data range and total rows
- [ ] Display last access timestamp
- [ ] Add processing type indicator (Client-side)
- [ ] Style according to design specifications

**Data to display:**
- Sheet name, description, status
- Sync strategy and direction
- Data range and row counts
- Creator information and timestamps

**Acceptance Criteria:**
- All sheet metadata displays correctly
- Timestamps are formatted properly
- Sync information is clear and accurate
- Visual hierarchy matches design

### Phase 5: Sheet Management Actions

#### Task 5.1: Edit Sheet Functionality
- [ ] Create edit sheet modal/form
- [ ] Pre-populate form with existing configuration
- [ ] Allow modification of sync strategy
- [ ] Update column mappings
- [ ] Implement save changes functionality
- [ ] Add validation for edit operations

**API Integration:**
- Use `PUT /api/sheets/:id` for updates
- Handle ownership validation
- Show success/error messages

**Acceptance Criteria:**
- Edit form loads with current values
- Changes save successfully
- Validation prevents invalid configurations
- Only sheet creators can edit their sheets

#### Task 5.2: Delete Sheet Functionality
- [ ] Add delete confirmation dialog
- [ ] Implement delete API call
- [ ] Handle ownership validation
- [ ] Show success/error messages
- [ ] Update sheet list after deletion
- [ ] Add protection against accidental deletion

**API Integration:**
- Use `DELETE /api/sheets/:id`
- Handle ownership and dependency checks

**Acceptance Criteria:**
- Confirmation dialog prevents accidental deletion
- Only sheet creators can delete their sheets
- Sheet list updates after successful deletion
- Error handling for deletion failures

#### Task 5.3: Check Access Functionality
- [ ] Implement access verification for all sheets
- [ ] Test read/write permissions
- [ ] Display access status results
- [ ] Handle permission errors
- [ ] Show detailed error messages
- [ ] Add retry functionality

**Features:**
- Test access to all configured sheets
- Show success/error status for each sheet
- Provide actionable error messages
- This functionality is implemented on the client-side to directly test Google Sheets API access from the user's browser.

**Acceptance Criteria:**
- Access check tests all configured sheets
- Results display clearly for each sheet
- Error messages are helpful and actionable
- Retry functionality works correctly

### Phase 6: Error Handling & Loading States

#### Task 6.1: Comprehensive Error Handling
- [ ] Add error boundaries for sheet operations
- [ ] Implement retry mechanisms for failed API calls
- [ ] Show user-friendly error messages
- [ ] Handle network connectivity issues
- [ ] Add fallback UI for critical errors
- [ ] Log errors for debugging

**Error Scenarios:**
- API failures, network issues
- Google Sheets access denied
- Invalid sheet configurations
- Token expiration

**Acceptance Criteria:**
- All error scenarios are handled gracefully
- Error messages are clear and actionable
- Retry mechanisms work correctly
- Users can recover from errors

#### Task 6.2: Loading States & Performance
- [ ] Add loading spinners for all async operations
- [ ] Implement skeleton screens for sheet list
- [ ] Show progress indicators for long operations
- [ ] Add performance monitoring
- [ ] Optimize API calls and caching
- [ ] Handle large dataset loading

**Loading States:**
- Initial page load
- Sheet list loading
- Google Sheets API calls
- Save/update operations

**Acceptance Criteria:**
- Loading states are visible for all operations
- Performance is acceptable for large sheets
- Caching reduces unnecessary API calls
- User feedback is clear during operations

### Phase 7: Mobile Responsiveness & Accessibility

#### Task 7.1: Mobile Optimization
- [ ] Optimize sheet list for mobile screens
- [ ] Make modal responsive for mobile
- [ ] Adjust form layouts for touch interfaces
- [ ] Test on various screen sizes
- [ ] Optimize touch targets
- [ ] Handle mobile-specific interactions

**Mobile Considerations:**
- Touch-friendly buttons and inputs
- Responsive modal sizing
- Optimized sheet card layout
- Mobile navigation patterns

**Acceptance Criteria:**
- All functionality works on mobile devices
- UI is touch-friendly and accessible
- Performance is acceptable on mobile
- Layout adapts properly to screen sizes

#### Task 7.2: Accessibility Implementation
- [ ] Add proper ARIA labels and roles
- [ ] Implement keyboard navigation
- [ ] Ensure color contrast compliance
- [ ] Add screen reader support
- [ ] Test with accessibility tools
- [ ] Add focus management for modals

**Accessibility Features:**
- Keyboard navigation for all interactions
- Screen reader compatibility
- High contrast support
- Focus indicators

**Acceptance Criteria:**
- Passes WCAG 2.1 AA compliance
- Keyboard navigation works completely
- Screen readers can access all content
- Focus management is proper

### Phase 8: Integration & Testing

#### Task 8.1: API Integration Testing
- [ ] Test all API endpoints with real data
- [ ] Verify error handling for API failures
- [ ] Test authentication and authorization
- [ ] Validate data persistence
- [ ] Test concurrent user scenarios
- [ ] Performance test with large datasets

**API Endpoints to Test:**
- `GET /api/sheets`
- `POST /api/sheets`
- `PUT /api/sheets/:id`
- `DELETE /api/sheets/:id`
- `GET /api/auth/google-sheets-token`
- `PUT /api/auth/google-sheets-token`

**Acceptance Criteria:**
- All API integrations work correctly
- Error handling is comprehensive
- Performance meets requirements
- Data consistency is maintained

#### Task 8.2: End-to-End Testing
- [ ] Test complete sheet creation workflow
- [ ] Test sheet editing and deletion
- [ ] Verify Google Sheets integration
- [ ] Test OAuth flow completely
- [ ] Validate data synchronization
- [ ] Test error recovery scenarios

**Test Scenarios:**
- New user adding first sheet
- Existing user managing multiple sheets
- Error scenarios and recovery
- Performance with large sheets

**Acceptance Criteria:**
- Complete workflows function correctly
- Error scenarios are handled properly
- Performance meets user expectations
- Data integrity is maintained

## Technical Requirements

### Dependencies
- Google Sheets API client library
- OAuth 2.0 implementation
- Form validation library
- Modal/dialog components
- Loading state components

### Performance Considerations
- Lazy loading for large sheet lists
- Caching for Google Sheets API calls
- Debounced API calls for form inputs
- Optimized re-rendering

### Security Requirements
- Secure token storage and handling
- Input validation and sanitization
- CSRF protection
- Proper error message handling (no sensitive data exposure)

## Definition of Done

### For Each Task:
- [ ] Code is implemented and tested
- [ ] UI matches design specifications
- [ ] Responsive design works on all screen sizes
- [ ] Accessibility requirements are met
- [ ] Error handling is comprehensive
- [ ] Loading states are implemented
- [ ] API integration is complete and tested
- [ ] Code is reviewed and approved

### For Overall Feature:
- [ ] All user workflows are functional
- [ ] Performance meets requirements
- [ ] Security requirements are satisfied
- [ ] Documentation is updated
- [ ] End-to-end testing is complete
- [ ] Feature is ready for production deployment

## Estimated Timeline (UPDATED)
- Phase 1-2: 3-4 days (Basic structure and connection status) ✅ COMPLETED
- **Phase 3: 5-7 days (Add sheet wizard - PRIORITY)** ⬅️ CURRENT FOCUS
- Phase 4: 2-3 days (Sheet list display - after we have data)
- Phase 5: 2-3 days (Edit/delete functionality)
- Phase 6: 2 days (Error handling and loading states)
- Phase 7: 2 days (Mobile and accessibility)
- Phase 8: 2-3 days (Integration and testing)

**Total Estimated Time: 18-25 days**

## Priority Order (UPDATED)
1. **High Priority**: Phases 1-2 ✅ DONE, Phase 3 ⬅️ NEXT (Add sheet functionality first)
2. **Medium Priority**: Phase 4 (Sheet display after we have data), Phase 5 (Management actions)
3. **Low Priority**: Phases 6-8 (Polish, optimization, and testing)

## Rationale for Phase Reordering

### Why Add Sheet (Phase 3) Before Sheet List (Phase 4):

1. **Logical Development Flow**: 
   - Need to create sheets before we can display them
   - Testing add functionality is easier without depending on list display
   - Can test with API directly first

2. **User Experience Logic**:
   - New users will need to add their first sheet
   - Empty state handling is simpler when add functionality exists
   - Progressive disclosure: add first, then manage

3. **Technical Dependencies**:
   - Sheet list component needs real data to test properly
   - Add functionality can be tested independently
   - Easier to debug add issues without list complexity

4. **Development Efficiency**:
   - Can validate API integration with add functionality first
   - Reduces complexity of testing multiple features simultaneously
   - Allows for iterative improvement of the add workflow

This reordering provides a more logical development progression and better aligns with how users will actually interact with the system.
