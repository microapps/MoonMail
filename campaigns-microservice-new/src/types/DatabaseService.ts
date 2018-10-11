export interface DatabaseService {
  put: (params: any) => Promise<any>,
  update: (params: any, hashKey: string, rangeKey: string) => Promise<any>,
  get: (params: any) => Promise<any>,
  list: (params: any) => Promise<any>,
  delete: (hash: string, range: string) => Promise<any>
}