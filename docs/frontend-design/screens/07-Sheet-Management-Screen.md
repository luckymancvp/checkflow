## Purpose
Configure and manage the system-wide Google Sheets integration, including detailed mapping and data reading configurations with performance optimization for large sheets.

## User Access
- All authenticated users (system-wide access)
- Full CRUD operations on sheet configurations

## Header Layout
┌─────────────────────────────────────────────────────────┐
│ Sheet Management | [Check Access] [Add Sheet] | [User]  │
└─────────────────────────────────────────────────────────┘

## Main Interface Layout

### Sheet List View
┌─────────────────────────────────────────────────────────┐
│ Google Sheets System Connection Status                  │
│ ● Connected as system-account@company.com [Reconnect]   │
│ Last Token Refresh: 2 minutes ago                      │
├─────────────────────────────────────────────────────────┤
│ Configured Sheets                                       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Website 1 Orders                    [Edit] [Delete] │ │
│ │ Status: ● Active    Processing: Client-side         │ │
│ │ Sync: Row 1500+    Direction: ↓ Top to Bottom      │ │
│ │ Sheet: \"Order\"     Last Access: 2 min ago          │ │
│ │ Data Range: 14 days    Total Rows: 2,847           │ │
│ │                                                     │ │
│ │ ┌───┐ Created by: John Doe (john@company.com)       │ │
│ │ │[J]│ Created on: Jan 15, 2024 at 2:30 PM          │ │
│ │ └───┘                                               │ │
│ │                                                     │ │
│ │ [Open in New Tab]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Website 2 Orders                    [Edit] [Delete] │ │
│ │ Status: ⚠ Token Issue  Processing: Client-side     │ │
│ │ Sync: Last 60 days Direction: ↑ Bottom to Top      │ │
│ │ Sheet: \"Order\"     Last Access: 5 min ago          │ │
│ │ Data Range: 60 days    Total Rows: 8,234           │ │
│ │                                                     │ │
│ │ ┌───┐ Created by: Alice Smith (alice@company.com)   │ │
│ │ │[A]│ Created on: Dec 28, 2023 at 10:15 AM         │ │
│ │ └───┘                                               │ │
│ │                                                     │ │
│ │ [Open in New Tab]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

## Sheet Configuration Modal

### Step 1: Basic Configuration & System Token Setup
┌─────────────────────────────────────────────────────────┐
│ Add New Sheet Configuration                     [✕]     │
├─────────────────────────────────────────────────────────┤
│ Step 1: Basic Information & System Access               │
│                                                         │
│ Sheet Name: [Website 1 Orders              ]           │
│ Description: [Main orders from website 1    ]          │
│                                                         │
│ Google Sheets System Access                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ System-wide Google Sheets access required        │ │
│ │                                                     │ │
│ │ This will allow CheckFlow to:                      │ │
│ │ • Read order data from your sheets                 │ │
│ │ • Update order status directly                     │ │
│ │ • Process data in your browser (client-side)      │ │
│ │                                                     │ │
│ │ [🔗 Connect System Google Account]                  │ │
│ │ (This connects a single Google account for all users) │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Google Sheet URL: [                                   ] │
│ [Paste your Google Sheets URL here]                    │
│                                                         │
│ [Cancel] [Next: Load Sheet Info →]                      │
└─────────────────────────────────────────────────────────┘

### Step 2: Sheet Selection (Client-Side Loading)
┌─────────────────────────────────────────────────────────┐
│ Add New Sheet Configuration                     [✕]     │
├─────────────────────────────────────────────────────────┤
│ Step 2: Select Sheet Tab                                │
│                                                         │
│ ✅ Successfully connected to Google Sheet               │
│ Processing: Client-side (Direct API access)            │
│                                                         │
│ Available Sheet Tabs: (Loaded from Google Sheets API)  │
│ ● Order (Default - Recommended)                         │
│ ○ Summary                                               │
│ ○ Archive                                               │
│ ○ Settings                                              │
│ ○ Dashboard                                             │
│                                                         │
│ Selected Sheet: [Order ▼]                               │
│                                                         │
│ Preview: 8,247 rows detected (Client-side scan)        │
│ ⚠️ Large sheet detected - Performance optimization required │
│ Headers found in row 1                                  │
│                                                         │
│ [← Back] [Next: Sync Strategy →]                        │
└─────────────────────────────────────────────────────────┘

### Step 3: Sync Strategy for Large Sheets
┌─────────────────────────────────────────────────────────┐
│ Add New Sheet Configuration                     [✕]     │
├─────────────────────────────────────────────────────────┤
│ Step 3: Sync Strategy (Performance Optimization)       │
│                                                         │
│ Sheet Size: 8,247 rows detected                        │
│ ⚠️ Large sheet - Choose sync strategy for performance   │
│                                                         │
│ Sync Strategy Selection                                 │
│ ○ Option 1: Sync from specific row number              │
│ ● Option 2: Sync by date range (last N days) - Default │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Option 1: Row-Based Sync                            │ │
│ │                                                     │ │
│ │ Start syncing from row: [1500    ]                 │ │
│ │ ☑ Skip older rows for performance                   │ │
│ │                                                     │ │
│ │ Estimated rows to sync: ~6,747                     │ │
│ │ Performance impact: ⚡ Good                         │ │
│ │                                                     │ │
│ │ Use this when:                                      │ │
│ │ • You know the approximate row of recent orders    │ │
│ │ • Historical data is not needed                    │ │
│ │ • You want maximum performance                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Option 2: Date-Based Sync (RECOMMENDED - DEFAULT)   │ │
│ │                                                     │ │
│ │ Sync orders from last: [60 days ▼] (Default)       │ │
│ │ Recommended: 2 months for optimal performance       │ │
│ │                                                     │ │
│ │ Available options:                                  │ │
│ │ • 7 days (Most recent only)                        │ │
│ │ • 14 days (Last 2 weeks)                           │ │
│ │ • 30 days (Last month)                             │ │
│ │ • 60 days (2 months - default)                     │ │
│ │ • 90 days (3 months)                              │ │
│ │ • 180 days (6 months)                             │ │
│ │ • All data (No filter - may be slow)              │ │
│ │                                                     │ │
│ │ Estimated rows: ~2,400 orders                      │ │
│ │ Performance impact: ⚡ Good                         │ │
│ │                                                     │ │
│ │ Use this when:                                      │ │
│ │ • You have date columns in your sheet              │ │
│ │ • You want to include recent historical data       │ │
│ │ • Row numbers are unreliable                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Performance Recommendations                             │
│ • Sheets with 1000+ rows: Use sync optimization        │
│ • For daily use: 30-60 days is recommended            │ │
│ • Date-based sync is more reliable (Default)          │ │
│ • Row-based sync is faster but less flexible          │ │
│                                                         │
│ [← Back] [Next: Data Range →]                           │
└─────────────────────────────────────────────────────────┘

### Step 4: Data Range Configuration
┌─────────────────────────────────────────────────────────┐
│ Add New Sheet Configuration                     [✕]     │
├─────────────────────────────────────────────────────────┤
│ Step 4: Data Range Configuration                        │
│                                                         │
│ Header Row: [Row 1 ▼]                                   │
│ ☑ Sheet has header row                                  │
│                                                         │
│ Sync Strategy Applied                                   │
│ Strategy: Date-based sync (Last 60 days)               │
│ Estimated data range: A1500:N8247                      │
│ ⚡ Optimized for performance                            │
│                                                         │
│ Data Range (Client-side processing)                     │
│ Start Row: [1500     ] (Calculated from sync strategy) │
│ End Row:   [8247     ] (Auto-detected sheet end)       │
│ Columns:   [A] to [N]                                   │
│ Full Range: A1500:N8247                                 │
│                                                         │
│ Data Reading Direction                                  │
│ ● ↓ Top to Bottom (Newest orders at top)               │
│ ○ ↑ Bottom to Top (Newest orders at bottom)            │
│                                                         │
│ Client-side Processing Limits                           │
│ Max rows per load: [500 ▼] (Browser performance)       │
│ ☑ Only process rows with data                           │
│ ☑ Cache data in browser for 5 minutes                  │
│ ☑ Use pagination for large datasets                    │
│                                                         │
│ Performance Preview                                     │
│ Total rows to process: ~6,747                          │
│ Estimated load time: ~3-5 seconds                     │
│ Memory usage: ~20MB                                    │
│                                                         │
│ [← Back] [Next: Column Mapping →]                       │
└─────────────────────────────────────────────────────────┘

### Step 5: Column Mapping (Client-Side Auto-detect)
┌─────────────────────────────────────────────────────────┐
│ Add New Sheet Configuration                     [✕]     │
├─────────────────────────────────────────────────────────┤
│ Step 5: Column Mapping (Auto-detected)                 │
│                                                         │
│ Headers detected from Google Sheets:                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ A: Item ID      B: Status       C: Order Note       │ │
│ │ D: Designer     E: Design       F: Customer Image   │ │
│ │ G: Personalization H: Date      I: Store            │ │
│ │ J: Image        K: Product Type L: Product Name     │ │
│ │ M: Priority     N: Comments                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Required Field Mapping (Auto-detected)                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Item ID: [Column A ▼] ✅ Auto-matched               │ │
│ │   Sample: \"DAV-3743324273-4669119845\"               │ │
│ │                                                     │ │
│ │ Status: [Column B ▼] ✅ Auto-matched                │ │
│ │   Sample: \"DESIGNED\", \"NEED REPAIR\", \"CONFIRMED\"   │ │
│ │                                                     │ │
│ │ Order Note: [Column C ▼] ✅ Auto-matched            │ │
│ │   Sample: \"Can I change the ability to 'Friend...\"  │ │
│ │                                                     │ │
│ │ Designer: [Column D ▼] ✅ Auto-matched              │ │
│ │   Sample: \"anhpm\" (username without domain)        │ │
│ │                                                     │ │
│ │ Design: [Column E ▼] ✅ Auto-matched                │ │
│ │   Sample: \"https://drive.google.com/file/d/...\"    │ │
│ │                                                     │ │
│ │ Customer Image: [Column F ▼] ✅ Auto-matched        │ │
│ │   Sample: \"https://i.etsystatic.com/icm/...\"       │ │
│ │                                                     │ │
│ │ Personalization: [Column G ▼] ✅ Auto-matched       │ │
│ │   Sample: \"Option: Acrylic Block 3.9\" Leo & Lizette\" │ │
│ │                                                     │ │
│ │ Date: [Column H ▼] ✅ Auto-matched                  │ │
│ │   Sample: \"07-15-2025\" (MM-DD-YYYY format)         │ │
│ │   (Required for date-based sync strategy)          │ │
│ │                                                     │ │
│ │ Store: [Column I ▼] ✅ Auto-matched                 │ │
│ │   Sample: \"VintageVibesStoreVN\"                     │ │
│ │                                                     │ │
│ │ Image: [Column J ▼] ✅ Auto-matched                 │ │
│ │   Sample: \"https://i.etsystatic.com/54076614/...\"  │ │
│ │                                                     │ │
│ │ Product Type: [Column K ▼] ✅ Auto-matched          │ │
│ │   Sample: \"pokemon-anniversary-card\"               │ │
│ │                                                     │ │
│ │ Product Name: [Column L ▼] ✅ Auto-matched          │ │
│ │   Sample: \"Personalized Pokemon Anniversary Card...\" │ │
│ ��─────────────────────────────────────────────────────┘ │
│                                                         │
│ Status Value Mapping                                    │
│ Designed: [DESIGNED, designed, Design Complete]        │
│ Need Repair: [NEED REPAIR, need repair, Fix Required]  │
│ Confirmed: [CONFIRMED, confirmed, Approved]            │
│                                                         │
│ Date Column Validation (For Date-Based Sync)           │
│ ✅ Date format detected: MM-DD-YYYY                     │
│ ✅ Date range validated: Last 60 days found            │
│ Sample dates: 07-15-2025, 07-14-2025, 07-13-2025      │
│                                                         │
│ Field Type Configuration                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Text Fields:                                        │ │
│ │ • Item ID, Designer, Store, Product Type           │ │
│ │ • Product Name, Order Note, Personalization        │ │
│ │                                                     │ │
│ │ URL Fields (Link validation):                       │ │
│ │ • Design, Customer Image, Image                     │ │
│ │                                                     │ │
│ │ Date Fields (Format: MM-DD-YYYY):                   │ │
│ │ • Date                                              │ │
│ │                                                     │ │
│ │ Status Fields (Predefined values):                  │ │
│ │ • Status                                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [← Back] [Preview Data] [Save Configuration]           │
└─────────────────────────────────────────────────────────┘

## Sheet Edit Interface

### Performance Optimization Options
┌─────────────────────────────────────────────────────────┐
│ Edit Sheet: Website 1 Orders                   [✕]     │
├─────────────────────────────────────────────────────────┤
│ Current Sync Strategy                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Strategy: Date-based (Last 60 days)                │ │
│ │ Current range: A1500:N8247                         │ │
│ │ Last sync: 2 minutes ago                           │ │
│ │ Status: ✅ Working well                             │ │
│ │ Performance: ⚡ Good (3.2s load time)               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Change Sync Strategy                                    │
│ ● Keep current: Date-based (Last 60 days)              │
│ ○ Switch to: Row-based sync                            │
│ ○ Switch to: Date-based with different range           │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Option 1: Row-Based Sync                            │ │
│ │ Start from row: [1500    ] [Detect Current Row]    │ │
│ │ Benefits: Faster loading, precise control          │ │
│ │ Drawbacks: Manual updates needed                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Option 2: Date-Based Sync (DEFAULT)                 │ │
│ │ Sync range: [30 days ▼] [60 days] [90 days]        │ │
│ │ Benefits: Automatic updates, flexible, reliable    │ │
│ │ Drawbacks: Requires date column                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Column Mapping Updates                                  │
│ [Edit Field Mapping] [Test Column Detection]           │
│ [Update Status Values] [Validate URLs]                 │
│                                                         │
│ Quick Actions                                           │
│ [Test New Strategy] [Reset to Defaults]                │
│ [Optimize Performance] [View Sync Logs]                │
│                                                         │
│ [Cancel] [Save Changes]                                 │
└─────────────────────────────────────────────────────────┘

## Sample Data Preview

### Data Structure Sample
When configuring sheets, users will see preview data like:

```
Item ID: DAV-3743324273-4669119845
Status: DESIGNED
Order Note: Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here
Designer: anhpm
Design: https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk
Customer Image: https://i.etsystatic.com/icm/3b1753/790855145/icm_fullxfull.790855145_7byh3onicpgcwos8cckc.jpg?version=0
Personalization: \"Option: Acrylic Block 3.9\"\" Personalization: 1) Leo & Lizette 2) S2 3) 08/06/2025 4) Happy Anniversary 5) Power Couple -A perfect pair in battle, their strength multiplies when fighting side by side. 6) Happy 3 year anniversary, bebe! Thank you for the love, the laughs, and everything in between. I love you! 7) I CHOOSE YOU! 8) Style 1\"
Date: 07-15-2025
Store: VintageVibesStoreVN
Image: https://i.etsystatic.com/54076614/r/il/05d327/6967622997/il_300x300.6967622997_ifmf.jpg
Product Type: pokemon-anniversary-card
Product Name: Personalized Pokemon Anniversary Card, Custom Photo Anime Wedding Card, Anniversary Gift, Gift for Him, Gift for Her, Custom Card for Couple
```

## Component Details

### Check Access Button
- **Location**: Only in header next to \"Add Sheet\" button
- **Purpose**: Verify client has permission to access all configured Google Sheets
- **Action**: Tests read/write access to each sheet and displays results
- **Visual Feedback**: Shows success/error status for each sheet

### Last Access Information
- **Data Source**: Server API tracking when users update status or notes
- **Display**: \"Last Access: X minutes/hours ago\" 
- **Update Trigger**: Updated when supporters change order status or add notes
- **Not Updated**: When only viewing/reading data

### Creator Information
- **Avatar**: User profile image or initials in circular badge
- **Name & Email**: Full name and email address of user who created the sheet configuration
- **Created Date**: Date and time when the sheet was added to CheckFlow (not Google Sheet creation)
- **Display Format**: \"Created by: [Name] ([email]) Created on: [Date] at [Time]\"

### Open in New Tab Button
- **Location**: Bottom of each sheet card in the list view
- **Purpose**: Direct link to open the Google Sheet in a new browser tab
- **Action**: Opens the actual Google Sheet URL in new tab for direct editing

### Sheet List Cards
- **Sheet Name**: Prominent display instead of Sheet ID
- **Status Indicators**: Active/Warning/Error with color coding
- **Sync Information**: Current sync strategy and data range
- **Performance Metrics**: Total rows and last access time
- **Creator Attribution**: Avatar, name, email, and creation timestamp
- **Quick Actions**: Edit, Delete, and Open in New Tab buttons

This enhanced design provides comprehensive field mapping for the complete order data structure while maintaining performance optimization and user-friendly configuration.`
}
