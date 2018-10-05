export interface DatabaseService {
  put: (params: any) => Promise<any>,
  get: (params: any) => Promise<any>,
  list: (params: any) => Promise<any>
}