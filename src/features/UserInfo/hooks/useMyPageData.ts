import { useSuspenseQuery } from '@tanstack/react-query';
import { getMyPage, mypageKeys } from '@/entities/user';

export const useMyPageData = () => {
  const query = useSuspenseQuery({
    queryKey: mypageKeys.all,
    queryFn: getMyPage,
  });

  return {
    ...query,
    refetch: query.refetch,
  };
};
