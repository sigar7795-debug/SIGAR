import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="relative hidden w-[268px] shrink-0 border-r border-olive/30 bg-field p-5 md:block">
        <div className="flex items-center gap-3 border-b border-sand/20 pb-5">
          <Skeleton className="h-9 w-9 rounded-none bg-sand/20" />
          <Skeleton className="h-5 w-24 rounded-none bg-sand/20" />
        </div>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              className="h-11 w-full rounded-none bg-sand/15"
              key={index}
            />
          ))}
        </div>

        <div className="absolute inset-x-5 bottom-5 border-t border-sand/20 pt-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full bg-sand/20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded-none bg-sand/20" />
              <Skeleton className="h-2 w-32 rounded-none bg-sand/15" />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-olive/25 px-5 lg:px-8">
          <Skeleton className="h-4 w-36 rounded-none" />
          <Skeleton className="h-9 w-52 rounded-none" />
        </header>

        <main className="space-y-7 p-5 lg:p-8">
          <div className="space-y-3 border-b border-olive/25 pb-7">
            <Skeleton className="h-9 w-52 rounded-none" />
            <Skeleton className="h-4 w-80 max-w-full rounded-none" />
          </div>
          <div className="grid gap-px bg-olive/25 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-32 rounded-none" key={index} />
            ))}
          </div>
          <Skeleton className="h-72 rounded-none" />
        </main>
      </div>
    </div>
  );
}
