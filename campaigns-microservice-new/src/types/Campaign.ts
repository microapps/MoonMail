export interface Campaign {
  id: string;
  userId: string;
  senderId: string;
  segmentId: string;
  listId: string;
  subject: string;
  name: string;
  status: CampaignStatus;
  body: string;
  template: string;
  isUpToDate: boolean;
  sentAt: number;
  createdAt: number;
  scheduleAt: number;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PAYMENT_GATEWAY_ERROR = 'PaymentGatewayError'
}

export interface CampaignEvent {
  campaign: Campaign,
  authToken: string
}