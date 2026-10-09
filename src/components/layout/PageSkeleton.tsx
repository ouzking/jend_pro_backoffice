import { Skeleton } from '@/components/ui/States'

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de la page">
      <Skeleton className="mb-2 h-3 w-32" />
      <Skeleton className="mb-8 h-7 w-64" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}
