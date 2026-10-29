param location string
param appServiceName string
param appServicePlanName string
param tags object

resource plan 'Microsoft.Web/serverfarms@2026-08-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2026-08-01' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      // El ZIP contiene dist/ ya compilado; no necesita npm ni node_modules.
      appCommandLine: 'node server/index.mjs'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: true
      remoteDebuggingEnabled: false
    }
  }
}

resource settings 'Microsoft.Web/sites/config@2026-08-01' = {
  parent: app
  name: 'appsettings'
  properties: {
    HOST: '0.0.0.0'
    PORT: '8080'
    NODE_ENV: 'production'
    // Azure puede asignar un hostname con sufijo regional; no se presupone su forma.
    WEBIQ_ALLOWED_HOSTS: app.properties.defaultHostName
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
    ENABLE_ORYX_BUILD: 'false'
    WEBSITE_WARMUP_PATH: '/api/status'
    WEBSITE_WARMUP_STATUSES: '200'
  }
}

resource scmAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-08-01' = {
  parent: app
  name: 'scm'
  properties: {
    allow: false
  }
}

resource ftpAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-08-01' = {
  parent: app
  name: 'ftp'
  properties: {
    allow: false
  }
}

output appServiceId string = app.id
output appServicePlanId string = plan.id
output appUrl string = 'https://${app.properties.defaultHostName}'
