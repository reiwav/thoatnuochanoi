# Implementation Plan: Inundation Survey & Mechanization Features

This plan outlines the steps to add "Khảo sát thiết kế" (Design Survey) and "Cơ giới" (Mechanization) features to the Inundation module, as requested.

## 1. Backend Changes

### 1.1 Model Updates (`models.InundationReport`)
Add new fields to track survey and mechanization data within the `InundationReport` struct.

```go
// ai_tnhn/ai-api-tnhn/internal/models/inundation.go

type InundationUpdate struct {
    // ... basic fields ...
    // Technical sync fields
    SurveyChecked bool     `bson:"survey_checked" json:"survey_checked"`
    SurveyImages  []string `bson:"survey_images" json:"survey_images"`
    SurveyNote    string   `bson:"survey_note" json:"survey_note"`
    SurveyUserID  string   `bson:"survey_user_id" json:"survey_user_id"`
    MechChecked   bool     `bson:"mech_checked" json:"mech_checked"`
    MechImages    []string `bson:"mech_images" json:"mech_images"`
    MechNote      string   `bson:"mech_note" json:"mech_note"`
    MechD         string   `bson:"mech_d" json:"mech_d"`
    MechR         string   `bson:"mech_r" json:"mech_r"`
    MechS         string   `bson:"mech_s" json:"mech_s"`
    MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
}

type InundationReport struct {
    // ... basic fields ...
    // Design Survey Data
    SurveyChecked bool     `bson:"survey_checked" json:"survey_checked"`
    SurveyImages  []string `bson:"survey_images" json:"survey_images"`
    SurveyNote    string   `bson:"survey_note" json:"survey_note"`
    SurveyUserID  string   `bson:"survey_user_id" json:"survey_user_id"`
    // Mechanization Data
    MechChecked   bool     `bson:"mech_checked" json:"mech_checked"`
    MechImages    []string `bson:"mech_images" json:"mech_images"`
    MechNote      string   `bson:"mech_note" json:"mech_note"`
    MechD         string   `bson:"mech_d" json:"mech_d"`
    MechR         string   `bson:"mech_r" json:"mech_r"`
    MechS         string   `bson:"mech_s" json:"mech_s"`
    MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
}
```

### 1.2 Permissions
Define two new permission codes:
- `inundation:survey`: Allow updating Survey section (XN Khảo sát thiết kế).
- `inundation:mech`: Allow updating Mechanization section (XN Cơ giới).

### 1.3 Service Logic Updates
Update the inundation update service and handler to handle these specific fields when a report is updated.

### 1.4 History Synchronization
When a Survey or Mechanization update is performed on a report, the service will:
1. Update the main technical fields on the `InundationReport` record.
2. Find the **latest** update record in the `InundationUpdate` collection for that report.
3. Synchronize the technical fields into that latest update record.
   * This ensures that staff viewing the report's history/timeline can see these technical interventions without switching views.
   * If no updates exist, the synchronization to history will be skipped.

## 2. Frontend Changes

### 2.1 UI Component Architecture
Modify `InundationDashboard.jsx` (specifically `CollapsiblePointRow`) to replace the current single-view layout with a Tab-based interface.

**Proposed Tabs:**
1.  **Nhận xét (Reviews):** Displays existing reviewer comments and historical updates.
2.  **Khảo sát thiết kế (Design Survey):** Form for "Xí nghiệp khảo sát thiết kế" including "Đã kiểm tra" checkbox, image upload, and note field.
3.  **Cơ giới (Mechanization):** Form for "Xí nghiệp Cơ giới" including "Đã ứng trực" checkbox, image upload, and "D, R, S" status fields.

### 2.2 Tab Logic & Permissions
- **Visibility Logic:** 
    - The "Survey" tab should be visible if user has `inundation:survey` OR if the point belongs to/shared with an organization of "Khảo sát thiết kế" type.
    - The "Mechanization" tab should be visible if user has `inundation:mech` OR if the point is shared with "Xí nghiệp Cơ giới".
- **Dynamic Labels:** 
    - Use labels like "Xí nghiệp địa bàn hỗ trợ" if the user's organization is from `shared_org_ids`.

### 2.3 Form Implementation
- Use standard Material UI components (`Tab`, `Tabs`, `Checkbox`, `TextField`, `Button`).
- Integrate with `getInundationImageUrl` and `inundationApi.updateReport` logic.

## 3. Workflow Implementation

1.  **Phase 1: Backend Foundation**
    *   Update models in `internal/models/inundation.go`.
    *   Update repository and service to support new fields.
2.  **Phase 2: Frontend Layout**
    *   Implement Tab structure in `InundationDashboard.jsx`.
    *   Add basic UI components for Survey and Mechanization tabs.
3.  **Phase 3: Integration & Polish**
    *   Connect forms to save data to the backend.
    *   Implement conditional visibility based on the user's role and station assignment.

---

> [!NOTE]
> The "D, R, S" fields for Mechanization will be implemented as inputs or status displays as shown in the mockup to allow quick monitoring.

> [!IMPORTANT]
> The sharing logic will use `shared_org_ids` to allow multiple units to collaborate on a single flooding point.
