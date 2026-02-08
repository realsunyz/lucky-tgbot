import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EditLotterySkeleton() {
  return (
    <div className="py-8 px-4 flex justify-center w-full">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header skeleton */}
        <div className="text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-3 justify-center sm:justify-start">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="hidden sm:block h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="gap-2">
              <CardHeader>
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2"
                  >
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-2">
              <CardHeader>
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3">
            <Card className="gap-2">
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Table header skeleton */}
                  <div className="hidden sm:grid grid-cols-5 gap-4 pb-2 border-b">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>

                  {/* Table rows skeleton */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-3 sm:space-y-0">
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-5 gap-4 py-3 items-center">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-12 rounded" />
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="sm:hidden p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-6 w-12 rounded" />
                        </div>
                        <div className="flex gap-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Skeleton className="h-8 w-16 rounded" />
                          <Skeleton className="h-8 w-16 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
