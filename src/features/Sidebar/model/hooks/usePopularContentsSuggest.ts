import { useQuery } from '@tanstack/react-query';
import { getPopularContents, searchContents } from '@/entities/content/api/contentApi';
import { contentQueryKeys } from '@/entities/content/api/queryKeys';
import { getPlacesFromContents } from '../utils';
import type { Place } from '../types';

interface UsePopularContentsSuggestOptions {
  onPlacesChange?: (places: Place[]) => void;
  onSearchStateChange?: (isSearching: boolean, query: string) => void;
}

// 사이드바의 인기 콘텐츠 제안 (상위 5개 + 클릭 시 장소 검색).
// entities의 usePopularContents(useSuspenseQuery)와 같은 중앙 키를 써야 캐시가 한 벌로 유지된다.
export function usePopularContentsSuggest(options: UsePopularContentsSuggestOptions = {}) {
  const { onPlacesChange, onSearchStateChange } = options;

  const { data: popularContents = [], isLoading } = useQuery({
    queryKey: contentQueryKeys.popular(),
    queryFn: getPopularContents,
    select: (contents) => contents.slice(0, 5),
  });

  const handleContentClick = async (contentTitle: string) => {
    onSearchStateChange?.(true, contentTitle);

    try {
      const contents = await searchContents(contentTitle);

      if (contents && contents.length > 0) {
        const allPlaces = await getPlacesFromContents(contents);
        onPlacesChange?.(allPlaces);
      } else {
        onPlacesChange?.([]);
      }
    } catch {
      onPlacesChange?.([]);
    }
  };

  return {
    popularContents,
    isLoading,
    handleContentClick,
  };
}
