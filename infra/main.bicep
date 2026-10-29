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

@description('Endpoint OpenAI v1 del modelo que planifica y redacta el Caso 0. Vacío: el Caso 0 busca la pregunta tal cual.')
param llmEndpoint string = 'https://aif-fiq-ceyx0f.cognitiveservices.azure.com/openai/v1'
param llmModel string = 'gpt-5.4-mini'

@secure()
@description('Código que pide la web para usar el Caso 0. Vacío: se elimina el ajuste y el Caso 0 queda abierto.')
param liveAccessCode string = ''

@secure()
@description('Clave de Web IQ. Vacío: se elimina el ajuste y el Caso 0 queda desactivado.')
param webiqApiKey string = ''

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
    llmEndpoint: llmEndpoint
    llmModel: llmModel
    liveAccessCode: liveAccessCode
    webiqApiKey: webiqApiKey
  }
}

output resourceGroupId string = resourceGroup.id
output appServiceId string = app.outputs.appServiceId
output appServicePlanId string = app.outputs.appServicePlanId
output appUrl string = app.outputs.appUrl
output principalId string = app.outputs.principalId
