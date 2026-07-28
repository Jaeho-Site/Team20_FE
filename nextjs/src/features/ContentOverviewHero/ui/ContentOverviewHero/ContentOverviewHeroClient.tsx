'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ContentOverviewInfo } from '../ContentOverviewInfo/ContentOverviewInfo';
import { ContentOverviewActionButtons } from '../ContentOverviewActionButton/ContentOverviewActionButtons';
import type { ContentDetail } from '@/entities/content/model/types';

interface ContentOverviewHeroClientProps {
  contentDetail: ContentDetail;
  contentLocationsCount: number;
  description?: string;
}

export function ContentOverviewHeroClient({
  contentDetail,
  contentLocationsCount,
}: ContentOverviewHeroClientProps) {
  const router = useRouter();
  const poster = contentDetail.posterImageUrl?.trim();

  const handleMapViewClick = () => {
    router.push(`/content/${contentDetail.contentId}/map`);
  };

  return (
    <section className="bg-gradient-to-t from-[var(--color-gray-800)] to-[var(--color-gray-900)]">
      <div className="mx-auto max-w-7xl px-[var(--spacing-4)] sm:px-[var(--spacing-6)] lg:px-[var(--spacing-8)]">
        <div className="relative h-[40rem] md:h-[56rem] lg:h-[64rem] rounded-2xl overflow-hidden">
          {poster && (
            <Image
              src={poster}
              alt={contentDetail.title}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-contain rounded-2xl"
            />
          )}
        </div>

        <div className="text-gray-900 ">
          <ContentOverviewInfo
            title={contentDetail.title}
            category={contentDetail.category}
            countOfLocations={contentLocationsCount}
          />
        </div>
        <div>
          <ContentOverviewActionButtons onMapViewClick={handleMapViewClick} />
        </div>
      </div>
    </section>
  );
}
