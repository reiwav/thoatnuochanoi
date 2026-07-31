# Refactoring InundationHistoryView

## Goal
Splitting the `InundationHistoryView.jsx` component to cleanly separate the Point History logic (with pagination) from the Report History logic (without pagination), as per the user's request. We will eliminate the `startsWith` checks by using dedicated smart components.

## Proposed Changes

### 1. Extract Presentation Logic to `InundationHistoryTimeline.jsx`
Create a new "dumb" component `InundationHistoryTimeline` that takes care of the UI rendering (the timeline, icons, image viewer, load more button).
- **Props**: `title`, `hideHeader`, `history` (array), `loading`, `loadingMore`, `hasMore`, `onLoadMore`.

### 2. Create `InundationPointHistoryView.jsx`
Create a smart component specifically for fetching and managing **Point History**.
- Takes `pointId` prop.
- Handles pagination (`last_report_id`, `limit = 5`).
- Uses `InundationHistoryTimeline` to render the data.

### 3. Create `InundationReportHistoryView.jsx`
Create a smart component specifically for fetching and managing **Report History**.
- Takes `reportId` prop.
- No pagination logic (loads all history at once).
- Uses `InundationHistoryTimeline` to render the data.

### 4. Update References in the App
- `src/views/employee/inundation/InundationHistoryDetail.jsx`: Use `InundationPointHistoryView` (since it's meant for point history).
- `src/views/admin/station/inundation/History.jsx`: Use `InundationPointHistoryView`.
- `src/views/shared/inundation/InundationDetailDialog.jsx`: 
  - **Open Question**: The `InundationDetailDialog` currently receives a `point` object. Sometimes this object is an actual Point (`inpt_...`), and sometimes it's a Report (`inrep_...`) coming from the Yearly view.
  - To handle this cleanly without `startsWith`, we can check the ID format locally in `InundationDetailDialog.jsx` and render `<InundationReportHistoryView reportId={point.id} />` if it's a report, or `<InundationPointHistoryView pointId={point.id} />` if it's a point. Or, even better, if this dialog is supposed to show the timeline for the *selected report*, we should render `<InundationReportHistoryView reportId={selectedReport?.id} />`. Which behavior do you prefer for `InundationDetailDialog`?

## Verification Plan
- Replace the current `InundationHistoryView.jsx` usages.
- Delete the old `InundationHistoryView.jsx` once everything is migrated.
- Ensure the UI renders correctly in both Point History (admin/employee screens) and Report History (Yearly popup).
