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
| `POST: /dynamics/oauth2/v2.0/token`                                | Dynamics OAuth token stub                     |
| `GET: /dynamics/api/data/v9.2/contacts(<guid>)`                    | Dynamics single contact stub                  |
| `GET: /dynamics/api/data/v9.2/contacts`                            | Dynamics contacts collection stub (`$filter`) |
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

### Dynamics contact details stub endpoints

Stands in for the Dynamics 365 contact details integration, which backs the
"who is the exemption for" value in marine-licensing-backend. There are no Dynamics
credentials or network access locally, so both the OAuth token call and the contacts
lookup are stubbed.

- Route index: `src/dynamics/api/index.js`
- Controllers: `src/dynamics/api/controllers/{post-token-stub,get-contact-stub,get-contacts-stub}.js`
- Shared contact resolution: `src/dynamics/api/controllers/contacts.js`
- Contact data: `src/dynamics/data/contacts.json`

Behaviour:

- `POST /dynamics/oauth2/v2.0/token` accepts any client credentials payload and returns a
  fixed `access_token`. The client secret is never logged.
- `GET /dynamics/api/data/v9.2/contacts(<guid>)` returns a single contact entity with
  `fullname` (plus `firstname`, `lastname`, `emailaddress1`). `$select` is ignored.
- `GET /dynamics/api/data/v9.2/contacts?$filter=contactid eq '<guid>' or ...` returns an
  OData collection `{ value: [{ contactid, fullname }] }`, used for batch lookups. With no
  `$filter` it returns every fixture contact.
- The fixture holds the five test users seeded into the local CDP defra-id stub
  (`Sally Self`, `Jason Bourne`, `John Doe`, `John Silver`, and a second `John Doe`), so the
  name shown in the service is the name of the user you logged in as. It mirrors
  `marine-licensing-frontend/compose/users/*.json` — re-sync `src/dynamics/data/contacts.json`
  if those fixtures change.
- Contacts are keyed on the registration's **`contactId`**, which is what the backend stores
  on exemptions and looks up — not the `userId` you type on the stub login page. The `userId`
  is accepted as an alias for convenience; the id that was asked for is echoed back as
  `contactid`.
- Any other valid GUID resolves to a placeholder named after itself
  (`3fa85f64-…` → `Test User 3fa85f64`), so locally seeded contact IDs always return
  something without looking like a real person. A non-GUID id returns a Dynamics-shaped 404.

Point the backend at this stub (see its `.env.template`):

```bash
DYNAMICS_ENABLED=true
DYNAMICS_TOKEN_URL=http://localhost:3001/dynamics/oauth2/v2.0/token
DYNAMICS_API_CONTACT_DETAILS_URL='http://localhost:3001/dynamics/api/data/v9.2/contacts({{contactId}})?$select=fullname'
DYNAMICS_API_CONTACT_DETAILS_BASE_URL=http://localhost:3001/dynamics/api/data/v9.2
```

Example:

```bash
curl "http://localhost:3001/dynamics/api/data/v9.2/contacts(00000000-0000-0000-0000-000000000001)?\$select=fullname"
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
