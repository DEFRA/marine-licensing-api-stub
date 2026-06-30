import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'

const policyFeatures = [
  {
    attributes: {
      PolicyCode: 'E-AGG-3',
      Sector: 'Aggregates',
      isSpatial: 1
    }
  },
  {
    attributes: {
      PolicyCode: 'E-MPA-1',
      Sector: 'Marine protected areas',
      isSpatial: 1
    }
  },
  {
    attributes: {
      PolicyCode: 'E-BIO-1',
      Sector: 'Biodiversity',
      isSpatial: 0
    }
  },
  {
    attributes: {
      PolicyCode: 'E-BIO-2',
      Sector: 'Biodiversity',
      isSpatial: 0
    }
  },
  {
    attributes: {
      PolicyCode: 'E-CAB-1',
      Sector: 'Cables',
      isSpatial: 0
    }
  }
]

const arcGisStubResponse = {
  objectIdFieldName: 'OBJECTID_12',
  uniqueIdField: {
    name: 'OBJECTID_12',
    isSystemMaintained: true
  },
  globalIdFieldName: '',
  geometryType: 'esriGeometryPolygon',
  spatialReference: {
    wkid: 4258,
    latestWkid: 4258
  },
  fields: [
    {
      name: 'PolicyCode',
      type: 'esriFieldTypeString',
      alias: 'PolicyCode',
      sqlType: 'sqlTypeOther',
      length: 50,
      domain: null,
      defaultValue: null
    },
    {
      name: 'Sector',
      type: 'esriFieldTypeString',
      alias: 'Sector',
      sqlType: 'sqlTypeOther',
      length: 254,
      domain: null,
      defaultValue: null
    },
    {
      name: 'isSpatial',
      type: 'esriFieldTypeSingle',
      alias: 'isSpatial',
      sqlType: 'sqlTypeOther',
      domain: null,
      defaultValue: null
    }
  ],
  features: policyFeatures
}

export const postArcgisStubController = {
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data'
    }
  },
  handler: async (request, h) => {
    try {
      request.logger.info(
        {
          event: {
            action: 'arcgis_stub_request',
            category: 'web',
            type: 'access'
          },
          url: {
            path: request.path,
            query: request.query
          }
        },
        'ArcGIS stub request received'
      )

      request.logger.info(
        {
          event: {
            action: 'arcgis_stub_response',
            category: 'web',
            type: 'info'
          },
          arcgis: {
            featureCount: arcGisStubResponse.features.length
          }
        },
        'ArcGIS stub response sent'
      )

      return h.response(arcGisStubResponse)
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return ArcGIS stub response'
      )
      throw Boom.internal('Failed to return ArcGIS stub response')
    }
  }
}
