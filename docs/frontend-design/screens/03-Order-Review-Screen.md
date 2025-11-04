# Order Review Screen (`/review`)

## Purpose
Main work interface for supporters to view pending orders, filter/search, and access review functionality.

## User Access
- Supporters only
- Primary daily work interface
- List view with filtering and navigation to detailed order views

## Related Documents
- **[Order Review Mode](04-Order-Review-Mode.md)**: Detailed review interface for status changes and notes
- **[Order Detail View](08-Order-Detail-View.md)**: Comprehensive order information display for sharing

## Header Layout
┌─────────────────────────────────────────────────────────┐
│ Order Review | ☐ Full Load | Sheets: [Website 1 ×] [+] │
│              │              │ ⚡ Loading... | 2.3s      │
└─────────────────────────────────────────────────────────┘

## Main Interface Layout

### Filter and Configuration Section
┌─────────────────────────────────────────────────────────┐
│ Filters & Search                        [Clear Filters] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Search: [Item ID, Product Name...              ]   │ │
│ │                                                     │ │
│ │ Product Type: [T-Shirt ×] [Mug ×] [+ Add More]     │ │
│ │                                                     │ │
│ │ Status: [DESIGNED ×] (Default) [+ Add Status]      │ │
│ │                                                     │ │
│ │ Date Range: [Last 7 days ▼] [Custom Range...]      │ │
│ └───────────────────────────────────────────��─────────┘ │
│                                                         │
│ Load Status: ✅ Website 1 loaded | 127 orders found    │
│                                                         │
│ Results: 45 matching orders                            │
│ [Start Sequential Review] [⌨️ Shortcuts]                │
└─────────────────────────────────────────────────────────┘

## Orders List View

### List Display (Automatic after filtering)
┌─────────────────────────────────────────────────────────┐
│ Orders List                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │☐│Status  │Item ID │Customer │Image   │Designer│Date │ │ │
│ │ │        │        │Image    │        │        │     │A│ │
│ ├─┼────────┼────────┼─────────┼────────┼────────┼─────┼─┤ │
│ │☐│DESIGNED│#12345✓ │[👤]     │[🖼️]    │Alice   │Today│✓│ │
│ │☐│DESIGNED│#12346  │[👤]     │[🖼️]    │Bob     │Today│👁│ │
│ │☐│DESIGNED│#12347  │[👤]     │[🖼️]    │Carol   │Jan14│✓│ │
│ │☐│DESIGNED│#12348  │[👤]     │[🖼️]    │Alice   │Jan14│👁│ │
│ └─────────────────────────────────────────────────────┘ │
│ Selected: 0/45 orders                                   │
└─────────────────────────────────────────────────────────┘

## Column Details

### Column Structure
The order list displays the following columns in order:

1. **Checkbox**: Select individual orders
2. **Status**: Current order status badge (DESIGNED, NEED_REPAIR, CONFIRMED)
3. **Item ID**: Order/Item identifier with copy-to-clipboard functionality
4. **Customer Image**: Thumbnail of customer-provided image for customization
5. **Image**: Thumbnail of design mockup or final design
6. **Designer**: Name of designer who worked on the order
7. **Date**: Order creation or last updated date
8. **Actions**: Two action buttons (Check + View)

### Item ID Column Details
- **Display**: Shows order/item ID (e.g., "#12345")
- **Click Interaction**: Click anywhere on the Item ID to copy to clipboard
- **Visual Feedback**: 
  - Green checkmark (✓) appears for 3 seconds after successful copy
  - Smooth fade-in/fade-out animation
  - Tooltip shows "Copied to clipboard!"
- **Accessibility**: Keyboard accessible (Enter/Space to copy when focused)

### Actions Column Details
- **Check Button** (✓): Opens [Order Review Mode](04-Order-Review-Mode.md) for that specific order
  - **Purpose**: Review and change order status with focused interface
  - **Interface**: new page (no URL change)
- **View Button** (👁): Opens [Order Detail View](08-Order-Detail-View.md) for that specific order
  - **Route**: `/order/[orderId]` (Detailed view for information sharing)
  - **Purpose**: View complete order details, shareable link

## Navigation Routes

### Interface Modes
- **List View**: `/review` (Current main interface)
- **Review Mode**: overlay interface (see [Order Review Mode](04-Order-Review-Mode.md))
- **Order Detail View**: `/order/[orderId]` (see [Order Detail View](08-Order-Detail-View.md))

### Route Benefits
- **Review Mode**: overlay keeps context and is faster for workflow
- **`/order/[orderId]`**: Clean, shareable URL for order details and team collaboration

## Header Component Details

### Full Load Toggle
- **Location**: Header, next to "Order Review" title
- **Default**: Disabled (unchecked)
- **Purpose**: When enabled, loads all data from sheet without sync strategy optimization
- **Warning**: Shows performance warning when enabled for large sheets

### Sheet Selection
- **Interface**: Tag-style with × to remove, + to add more
- **Multi-Select**: Can select multiple sheets simultaneously
- **Auto-Load**: Client begins reading Google Sheets data immediately when sheet is selected
- **Display**: Shows sheet name, not sheet ID

### Loading Indicator
- **Display**: Simple text "Loading..." or "✅ Loaded"
- **No Progress Bar**: Just status text indication
- **States**: 
  - "⚡ Loading..." (during data fetch)
  - "✅ Loaded" (when complete)
  - "❌ Error" (if failed)

### Load Time Display
- **Format**: Shows actual load time like "2.3s" or "1.7s"
- **Updates**: Real-time during loading, final time when complete
- **Location**: Right side of header after loading indicator

## Filter Component Details

### Search Field
- **Multi-Field Search**: Item ID, Product Name, Customer requirements
- **Real-Time**: Filters results as user types
- **Placeholder**: "Item ID, Product Name..."

### Product Type Filter
- **Multi-Select**: Tag-style interface [T-Shirt ×] [Mug ×]
- **Add More**: [+ Add More] button opens dropdown
- **Remove**: Click × on each tag to remove

### Status Filter
- **Default**: "DESIGNED" selected by default when entering screen
- **Multi-Select**: Can add multiple statuses
- **Options**: DESIGNED, NEED_REPAIR, CONFIRMED, etc.

### Date Range Filter
- **Quick Options**: Last 7 days, Last 30 days, Last 60 days
- **Custom Range**: Option for specific date range
- **Default**: No date filter applied

### Clear Filters Button
- **Purpose**: Resets all filter controls to default state
- **Does NOT**: Reload data from sheets
- **Resets To**: Search empty, Status = DESIGNED, Product Type = All, Date = No filter

### Shortcuts Button
- **Location**: Next to "Start Sequential Review" button
- **Icon**: ⌨️ keyboard icon with "Shortcuts" text
- **Purpose**: Opens modal or overlay showing all available keyboard shortcuts
- **Helps Users**: Discover and learn keyboard shortcuts for efficient workflow

## Data Loading Behavior

### Sheet Selection Trigger
- **Immediate Loading**: Client starts Google Sheets API calls when sheet is selected
- **Background Process**: Data loads in background while user continues to interact
- **Multiple Sheets**: Can load multiple sheets simultaneously

### Full Load vs Optimized Load
- **Default (Optimized)**: Uses sync strategy from sheet configuration (date-based or row-based)
- **Full Load**: Ignores sync strategy, loads entire sheet (performance warning)
- **User Choice**: Toggle in header allows switching between modes

### Loading States
- **Per Sheet**: Each selected sheet shows individual loading status
- **Aggregated**: Overall status shows when all selected sheets are loaded
- **Error Handling**: Failed sheets show error status, successful sheets remain loaded

### Automatic List Display
- **No Manual Trigger**: List view appears automatically after filtering
- **Real-Time Updates**: List refreshes as filters are applied
- **Immediate Feedback**: Results count updates in real-time

## Navigation & Workflow

### List View Navigation
- **Default Mode**: Screen opens in list view showing filtered results automatically
- **Pagination**: For large result sets
- **Sorting**: Click column headers
- **Individual Actions**: Click action buttons on specific orders

### Action Navigation
- **Check Action**: Opens [Order Review Mode](04-Order-Review-Mode.md) (overlay interface)
- **View Action**: Navigate to [Order Detail View](08-Order-Detail-View.md) at `/order/[orderId]`
- **Sequential Review**: "Start Sequential Review" begins workflow through filtered orders using Review Mode

### URL Sharing
- **Order Detail URLs**: `/order/[orderId]` can be shared with team members via View action
- **Bookmark Support**: URLs can be bookmarked for quick access
- **Deep Linking**: Direct access to specific orders via URL

## Keyboard Shortcuts System

### Shortcuts Discovery
- **Shortcuts Button**: Prominent [⌨️ Shortcuts] button in filter section
- **Modal/Overlay**: Clicking button opens comprehensive shortcuts reference
- **Context-Aware**: Available shortcuts depend on current interface state

### List View Shortcuts
- `/` - Focus search field
- `Enter` - Start sequential review
- `Space` - Select/deselect current row
- `Shift+A` - Select all visible
- `Esc` - Clear filters
- `C` - Copy current row's Item ID to clipboard
- `V` - View current row's order details
- `R` - Review (Check) current row's order

### Shortcuts Reference Modal
┌─────────────────────────────────────────────────────────┐
│ Keyboard Shortcuts                              [✕]     │
├─────────────────────────────────────────────────────────┤
│ List View Shortcuts                                     │
│ • / - Focus search field                                │
│ • Enter - Start sequential review                       │
│ • Space - Select/deselect current row                   │
│ • Shift+A - Select all visible                          │
│ • Esc - Clear filters                                   │
│ • C - Copy current Item ID to clipboard                 │
│ • V - View order details                                │
│ • R - Review (Check) order                              │
│                                                         │
│ Item ID Copy Feature                                    │
│ • Click any Item ID to copy to clipboard               │
│ • Green checkmark appears for 3 seconds                │
│ • Works with mouse click or keyboard (Enter/Space)     │
│                                                         │
│ [Close]                                                 │
└─────────────────────────────────────────────────────────┘

## Performance Considerations

### Data Management
- **Client-Side Processing**: All filtering and search happens client-side after data load
- **Caching**: Loaded sheet data cached in browser
- **Incremental Loading**: Large sheets can be loaded in chunks
- **Memory Management**: Automatic cleanup of unused data

### User Feedback
- **Load Time Display**: Shows actual performance impact of choices
- **Status Indicators**: Clear feedback on what's loading/loaded/failed
- **Copy Feedback**: Visual confirmation for clipboard operations
- **Performance Warnings**: Alerts for potentially slow operations

## Mobile Responsiveness

### Mobile Header
┌─────────────────────┐
│ Order Review        │
│ ☐ Full Load         │
│ Sheets: [Web1 ×][+] │
│ ⚡ Loading... 2.3s   │
└─────────────────────┘

### Mobile Filters
- Collapsible filter section
- Touch-friendly controls
- Simplified multi-select interfaces

### Mobile List View
- Responsive table with horizontal scroll if needed
- Touch-friendly checkboxes and buttons
- Optimized column widths for mobile screens
- Larger touch targets for Item ID copy functionality

### Mobile Actions
- Touch-friendly action buttons
- Clear visual feedback for clipboard operations
- Swipe gestures for additional actions

This enhanced design provides a comprehensive list interface with clipboard functionality for Item IDs, dual action buttons for different workflows, and clear navigation paths between the main review list, focused review mode, and detailed information view.
