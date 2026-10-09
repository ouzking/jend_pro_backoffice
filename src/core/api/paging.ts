/** Offset page returned by list endpoints (backend: limit/offset + total_count). */
export interface Page<T> {
  items: T[]
  total: number
}

export interface PageRequest {
  /** 1-based */
  page: number
  pageSize: number
}

export function toLimitOffset({ page, pageSize }: PageRequest): { p_limit: number; p_offset: number } {
  const safeSize = Math.min(Math.max(Math.trunc(pageSize) || 25, 1), 100)
  const safePage = Math.max(Math.trunc(page) || 1, 1)
  return { p_limit: safeSize, p_offset: (safePage - 1) * safeSize }
}

/** Builds a Page from rows carrying a window `total_count` column. */
export function toPage<R extends { total_count: number | null }, T>(rows: readonly R[] | null, map: (row: R) => T): Page<T> {
  const list = rows ?? []
  return { items: list.map(map), total: Number(list[0]?.total_count ?? 0) }
}

/** Empty strings from forms / URLs become undefined (= "no filter"). */
export function blankToUndefined<T extends string>(value: T | '' | null | undefined): T | undefined {
  return value === '' || value === null || value === undefined ? undefined : value
}
