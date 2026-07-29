import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createItinerary,
  getItineraries,
  getItineraryDetail,
  updateItinerary,
  deleteItinerary,
} from './itineraryApi';
import { itineraryKeys } from './queryKeys';
// FSD 참고: entities 간 교차 import — 일정 변경이 마이페이지(user 도메인) 캐시를
// invalidate해야 하는 도메인 간 결합. 인라인 리터럴보다 낫다고 판단해 허용 (P4-1 정리 때 재검토)
import { mypageKeys } from '@/entities/user';
import type { CreateItineraryRequest } from '../model/types';
import { SAVE_ROUTE_MODAL } from '@/features/RoutePlanning/model/messages';

// 여행 계획 목록 조회
export const useItineraries = () => {
  return useQuery({
    queryKey: itineraryKeys.lists(),
    queryFn: getItineraries,
  });
};

// 여행 계획 상세 조회
export const useItineraryDetail = (itineraryId: string) => {
  return useQuery({
    queryKey: itineraryKeys.detail(itineraryId),
    queryFn: () => getItineraryDetail(itineraryId),
    enabled: !!itineraryId && itineraryId.length > 0,
  });
};

// 여행 계획 생성
export const useCreateItinerary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItineraryRequest) => createItinerary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itineraryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mypageKeys.all });
    },
    onError: () => {
      toast.error(SAVE_ROUTE_MODAL.VALIDATION.SAVE_FAILED);
    },
  });
};

// 여행 계획 수정
export const useUpdateItinerary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itineraryId, data }: { itineraryId: string; data: CreateItineraryRequest }) =>
      updateItinerary(itineraryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itineraryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itineraryKeys.detail(variables.itineraryId) });
      queryClient.invalidateQueries({ queryKey: mypageKeys.all });
    },
    onError: () => {
      toast.error(SAVE_ROUTE_MODAL.VALIDATION.UPDATE_FAILED);
    },
  });
};

// 여행 계획 삭제
export const useDeleteItinerary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itineraryId: string) => deleteItinerary(itineraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itineraryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mypageKeys.all });
      toast.success(SAVE_ROUTE_MODAL.SUCCESS.DELETE_MESSAGE);
    },
    onError: () => {
      toast.error(SAVE_ROUTE_MODAL.VALIDATION.DELETE_FAILED);
    },
  });
};
