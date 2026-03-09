import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Hotel data model for your SmartLift platform
  Hotel: a.model({
    id: a.id(),
    name: a.string().required(),
    city: a.string().required(),
    address: a.string(),
    googlePlaceId: a.string(),
    elevatorReputationScore: a.float(),
    totalElevatorMentions: a.integer(),
    serviceUrgency: a.enum(['critical', 'high', 'medium', 'low']),
    estimatedFloors: a.integer(),
    estimatedElevators: a.integer(),
  })
  .authorization(allow => [allow.authenticated()]),

  // AI-powered Customer Support Chat
  CustomerSupportChat: a.conversation({
    aiModel: a.ai.model('Claude 3.5 Sonnet'),
    systemPrompt: 'You are a professional customer support assistant for SmartLift, a precision elevator service company led by a U.S. Army veteran with cybersecurity and manufacturing expertise. You help hotel managers and facility directors with elevator maintenance inquiries, service scheduling, technical questions, and emergency support needs. Be professional, knowledgeable, and emphasize SmartLift military-grade precision, AWS-powered reliability, and Kaizen continuous improvement approach. Always prioritize safety and systematic problem-solving.',
  })
  .authorization(allow => allow.owner()),

  // AI Service Report Generator
  generateServiceReport: a.generation({
    aiModel: a.ai.model('Claude 3.5 Sonnet'),
    systemPrompt: 'You generate professional elevator service reports for SmartLift. Create detailed, technical reports based on elevator data provided. Include analysis, recommendations, and systematic next steps. Use precision and clarity - reflect the military and manufacturing background of the company.',
  })
  .arguments({
    hotelName: a.string().required(),
    elevatorData: a.string().required(),
    issuesFound: a.string(),
  })
  .returns(a.customType({
    report: a.string(),
    urgencyLevel: a.string(),
    recommendations: a.string().array(),
  }))
  .authorization(allow => [allow.authenticated()]),

  // AI Lead Analysis
  analyzeHotelLead: a.generation({
    aiModel: a.ai.model('Claude 3.5 Sonnet'),
    systemPrompt: 'You analyze hotel leads for SmartLift elevator services. Evaluate urgency, potential value, and recommended sales approach based on review sentiment about elevators, number of elevator mentions in reviews, building characteristics, and competitive landscape. Provide actionable intelligence for the sales team.',
  })
  .arguments({
    hotelName: a.string().required(),
    reviewSentiment: a.string(),
    elevatorMentions: a.integer(),
    buildingInfo: a.string(),
  })
  .returns(a.customType({
    leadScore: a.integer(),
    urgency: a.string(),
    recommendedApproach: a.string(),
    keyTalkingPoints: a.string().array(),
  }))
  .authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
