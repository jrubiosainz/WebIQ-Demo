targetScope = 'subscription'

@description('Region de la demo, independiente de Decision-1.')
param location string = 'spaincentral'

param resourceGroupName string = 'rg-webiq-demo-dev-d88a'
param appServiceName string = 'app-webiq-demo-dev-d88a'
param appServicePlanName string = 'plan-webiq-demo-dev-d88a'
param environmentName string = 'webiq-demo-dev-d88a'
param sessionId string = 'd88a9083-4855-48f8-8a45-042b18f51f52'
param deployedBy string
param createdAt string = utcNow()

var tags = {
  'app-onboard-skill': 'true'
  'app-onboard-session-id': sessionId
  'created-at': createdAt
  environment: environmentName
  'deployed-by': deployedBy
  application: 'webiq-demo'
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module app './app.bicep' = {
  name: 'webiq-app'
  scope: resourceGroup
  params: {
    location: location
    appServiceName: appServiceName
    appServicePlanName: appServicePlanName
    tags: tags
  }
}

output resourceGroupId string = resourceGroup.id
output appServiceId string = app.outputs.appServiceId
output appServicePlanId string = app.outputs.appServicePlanId
output appUrl string = app.outputs.appUrl
