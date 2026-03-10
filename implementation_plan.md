# Scenario Simulator Extraction Plan

## Goal Description
The user wants to separate the ML Engine tab (which contains the "Scenario Simulator" and "Key Demand Drivers") from the "Forecast Analytics" page and move it to its own dedicated page on the sidebar. This removes the "ML Engine" tab from [ManagerForecasts](file:///d:/SOFTWARE/Smart-Cafe-frontend/src/manager/forecasts/page.tsx#61-1751) and introduces a "Simulator" tab in the Manager's sidebar navigation.

## Proposed Changes

### Frontend
#### [NEW] src/manager/simulator/page.tsx
- Create a new component `ManagerSimulator`.
- Move the ML state variables (`mlData`, `mlOnline`, `mlLoading`, `predictionInput`, `predictionResult`) and API fetching logic (`fetchML`, [handleSimulate](file:///d:/SOFTWARE/Smart-Cafe-frontend/src/manager/forecasts/page.tsx#325-342)) from [ManagerForecasts](file:///d:/SOFTWARE/Smart-Cafe-frontend/src/manager/forecasts/page.tsx#61-1751) to this new page.
- Render the UI for "Key Demand Drivers" and "Scenario Simulator" on this dedicated page.

#### [MODIFY] src/manager/forecasts/page.tsx
- Remove all state variables, network calls, and UI exclusively used by the "ML Engine" tab.
- Remove the "ML Engine" tab from the tab navigation UI.

#### [MODIFY] src/components/common/Sidebar.tsx
- In the [getLinks()](file:///d:/SOFTWARE/Smart-Cafe-frontend/src/components/common/Sidebar.tsx#29-102) switch case for "manager", add a new route:
  `{ to: "/manager/simulator", label: "Simulator", icon: Activity }`

#### [MODIFY] src/App.tsx
- Lazy load the new component: `const ManagerSimulator = React.lazy(() => import("./manager/simulator/page"));`
- Add the route: `<Route path="/manager/simulator" element={<ManagerSimulator />} />` under the "manager" allowedRoles protected route block.

## Verification Plan

### Manual Verification
1. Click the "Simulator" link in the sidebar to ensure the new page loads seamlessly.
2. Ensure the "Forecasts" page no longer has the "ML Engine" tab but still accurately displays Overviews, Hourly info, and Trends.
3. Use the dropdowns in the Simulator page (Day, Meal, Weather, Context) and click "Simulate" to confirm that predictions still compute and display successfully via the Python ML API.
