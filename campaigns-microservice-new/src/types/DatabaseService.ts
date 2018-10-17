import { QueryOutput, Key } from "aws-sdk/clients/dynamodb";

export type ListOptions = {
  page?: number,
  limit?: number,
  fields?: Array<string>,
  filters?: {
    archived: {
      eq?: boolean,
      ne?: boolean
    }
  }
}