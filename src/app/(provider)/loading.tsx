import { Skeleton, SkeletonStats, SkeletonTable } from '@/components/ui';

export default function ProviderLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <SkeletonStats />
      <SkeletonTable rows={6} />
    </div>
  );
}
