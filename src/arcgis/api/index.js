import { postArcgisStubController } from './controllers/post-arcgis-stub.js'

export const arcgis = [
  {
    method: 'POST',
    path: '/ArcGIS/rest/services/PolicyData_MDP/FeatureServer/0/{any*}',
    ...postArcgisStubController
  }
]
