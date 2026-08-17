# marine-licensing-api-stub

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [API endpoints](#api-endpoints)
- [Development helpers](#development-helpers)
  - [Proxy](#proxy)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd marine-licensing-api-stub
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

Install git hooks (optional)

```bash
npm run git:hooks
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## API endpoints

| Endpoint                                                           | Description                                   |
| :----------------------------------------------------------------- | :-------------------------------------------- |
| `GET: /health`                                                     | Health                                        |
| `POST: /ArcGIS/rest/services/PolicyData_MDP/FeatureServer/0/<any>` | ArcGIS stub response (accepts any query/body) |
| `GET: /explore-marine-plans/api/policies`                          | GOV.UK policies API stub (5 policies)         |
| `POST: /oauth2/v2.0/token`                                         | OAuth client credentials token stub           |
| `POST: /<tenantId>/oauth2/v2.0/token`                              | Same, on the tenant-prefixed real path        |
| `GET: /api/address-lookup/v2.1/addresses`                          | DEFRA address lookup stub (requires Bearer)   |
| `GET: /example    `                                                | Example API (remove as needed)                |
| `GET: /example/<id>`                                               | Example API (remove as needed)                |

### ArcGIS stub endpoint

The ArcGIS stub route is defined using the backend-style API module structure:

- Route index: `src/arcgis/api/index.js`
- Controller: `src/arcgis/api/controllers/post-arcgis-stub.js`

Behaviour:

- Accepts `POST` requests under `/ArcGIS/rest/services/PolicyData_MDP/FeatureServer/0/`
- Accepts any query params and payload on that path
- Returns a fixed ArcGIS-style response with exactly 5 policies in `features`

Example:

```bash
curl -X POST "http://localhost:3001/ArcGIS/rest/services/PolicyData_MDP/FeatureServer/0/query?f=json" \
  -H "content-type: application/json" \
  -d '{"where":"1=1"}'
```

The controller also emits basic ECS-friendly logs for:

- Request received (path/query metadata)
- Response sent (feature count)

### GOV.UK policies stub endpoint

Drop-in replacement for `GOVUK_MARINE_POLICIES_API_URL` when
`https://environment.data.gov.uk/explore-marine-plans/api/policies` is unavailable
or times out.

- Route index: `src/policies/api/index.js`
- Controller: `src/policies/api/controllers/get-policies-stub.js`
- Policy data: `src/policies/data/policies.json`

Behaviour:

- Accepts `GET` requests at `/explore-marine-plans/api/policies`
- Returns a fixed JSON array of the same 5 policies stubbed by the ArcGIS endpoint:
  `E-AGG-3`, `E-MPA-1`, `E-BIO-1`, `E-BIO-2`, `E-CAB-1`
- Response shape matches the live GOV.UK Explore Marine Plans policies API
  (`code`, wording fields, `sector`, etc.)

Point the backend at this stub:

```bash
GOVUK_MARINE_POLICIES_API_URL=http://localhost:3001/explore-marine-plans/api/policies
```

Example:

```bash
curl "http://localhost:3001/explore-marine-plans/api/policies"
```

### OAuth token stub endpoint

Drop-in replacement for `MARINE_LICENSING_ADDRESS_LOOKUP_OAUTH_TOKEN_URL`
(`https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token`), so the frontend's
real client-credentials flow can be exercised locally.

- Route index: `src/oauth/api/index.js`
- Controller: `src/oauth/api/controllers/post-oauth-token-stub.js`
- Token store: `src/oauth/token-store.js`

Behaviour:

- Accepts form-encoded `POST` at `/oauth2/v2.0/token` and `/<tenantId>/oauth2/v2.0/token`
- Requires `grant_type=client_credentials` plus a non-empty `client_id` and `client_secret`
  (any values are accepted — this stands in for the gateway's checks, it does not verify them);
  anything else returns `400 {"error":"invalid_request"}`
- Returns `{ token_type, expires_in, access_token }`; tokens are held in a bounded in-memory
  store and are the only ones the address lookup endpoint accepts
- `OAUTH_STUB_TOKEN_TTL_SECONDS` (default `3600`) controls the token lifetime. Set it low to
  drive the consumer's token refresh and 401-retry paths.

### Address lookup stub endpoint

Drop-in replacement for `MARINE_LICENSING_ADDRESS_LOOKUP_API_URL`
(`https://dev-api-gateway.azure.defra.cloud/api/address-lookup/v2.1/addresses`).

- Route index: `src/address-lookup/api/index.js`
- Controller: `src/address-lookup/api/controllers/get-address-lookup-stub.js`
- Address data: `src/address-lookup/data/addresses.json`

Behaviour:

- `GET /api/address-lookup/v2.1/addresses?postcode=<postcode>`
- **Requires `Authorization: Bearer <token>`** from the OAuth token stub above; missing,
  malformed, unknown or expired tokens get `401`
- Postcodes are matched case- and whitespace-insensitively
- `NE4 7AR` returns 1 address, `NE1 1EE` returns 3, `NE99 1NC` returns `204 No Content`,
  anything else returns `200` with `results: []`
- Response shape matches the live API (`header` / `results` / `_info`)

Example:

```bash
TOKEN=$(curl -s -X POST "http://localhost:3001/oauth2/v2.0/token" \
  -d 'grant_type=client_credentials&client_id=local-stub-client-id&client_secret=local-stub-client-secret' \
  | jq -r .access_token)

curl "http://localhost:3001/api/address-lookup/v2.1/addresses?postcode=NE4%207AR" \
  -H "Authorization: Bearer $TOKEN"
```

## Development helpers

### Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Docker

Build:

```bash
docker build --no-cache --tag marine-licensing-api-stub .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 marine-licensing-api-stub
```

### Docker Compose

A local environment with:

- Floci for AWS services (S3, SQS, SNS etc)
- Redis
- This service.
- A commented out frontend example.

```bash
docker compose up --build -d
```

Mock AWS resources can be created when Floci starts up by editing the scripts in `./compose/floci/start.d/`.

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
