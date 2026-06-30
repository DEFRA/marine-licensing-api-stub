import { postArcgisStubController } from './controllers/post-arcgis-stub.js'

export const arcgis = [
  {
    method: 'POST',
    path: '/{any*}',
    ...postArcgisStubController
  }
]
