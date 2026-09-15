import {
  postEmpAddFeaturesStubController,
  postEmpUpdateFeaturesStubController
} from './controllers/post-emp-features-stub.js'
import {
  getEmpFailModeController,
  putEmpFailModeController
} from './controllers/put-emp-fail-mode.js'

// Drop-in replacement for the EMP (Explore Marine Planning) ArcGIS feature
// service. Point EMP_API_URL at the feature-service path and the caller appends
// /addFeatures and /updateFeatures itself:
//
//   EMP_API_URL=http://localhost:3002/ArcGIS/rest/services/Exemptions/FeatureServer/0
//
// Kept separate from the PolicyData_MDP routes: that layer is queried for marine
// plan policies and answers with `features`, while this one is written to and
// answers with `addResults`/`updateResults`.
export const emp = [
  {
    method: 'POST',
    path: '/ArcGIS/rest/services/Exemptions/FeatureServer/0/addFeatures',
    ...postEmpAddFeaturesStubController
  },
  {
    method: 'POST',
    path: '/ArcGIS/rest/services/Exemptions/FeatureServer/0/updateFeatures',
    ...postEmpUpdateFeaturesStubController
  },
  {
    method: 'PUT',
    path: '/emp-stub/fail-mode',
    ...putEmpFailModeController
  },
  {
    method: 'GET',
    path: '/emp-stub/fail-mode',
    ...getEmpFailModeController
  }
]
