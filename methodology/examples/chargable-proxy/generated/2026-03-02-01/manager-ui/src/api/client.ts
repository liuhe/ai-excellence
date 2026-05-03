const BASE = '/api'

export interface ApiResponse<T> {
  ok: boolean
  message: string
  data: T
}

export interface PackageView {
  id: number
  domain: string
  type: string
  quota: number
  effectiveDays: number
  usedQuota: number
  status: string
  activateTime: number
  expireTime: number
}

export interface AccountDetail {
  username: string
  packages: PackageView[]
}

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function queryAccount(username: string, password: string) {
  return post<AccountDetail>('/account/query', { username, password })
}

export async function bindPackage(username: string, password: string, couponCode: string) {
  return post<PackageView>('/account/bindPackage', { username, password, couponCode })
}

export async function createAccounts(params: {
  adminKey: string; idPrefix: string; count: number;
  domain: string; type: string; quota: number; effectiveDays: number
}) {
  return post<Array<{ username: string; password: string }>>('/admin/accounts', params)
}

export async function createCoupons(params: {
  adminKey: string; domain: string; type: string;
  quota: number; effectiveDays: number; count: number
}) {
  return post<string[]>('/admin/coupons', params)
}
