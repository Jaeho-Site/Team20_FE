import { useRef, useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import type { RoutePlace, UseSaveRouteFormOptions } from '../types';
import { saveRouteDefaults, saveRouteSchema } from '../schemas';
import { SAVE_ROUTE_MODAL } from '../messages';

export function useSaveRouteForm(options: UseSaveRouteFormOptions = {}) {
  const { onSave, onClose, onSuccess } = options;
  // 에러 배너는 폼 필드 밖의 제출 흐름(장소 0개, 저장 실패)도 다루므로 별도 상태
  const [submitError, setSubmitError] = useState<string | null>(null);
  const placesRef = useRef<RoutePlace[]>([]);

  const form = useForm({
    defaultValues: { ...saveRouteDefaults },
    validators: {
      onChange: saveRouteSchema,
      onBlur: saveRouteSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await onSave?.(value.title.trim(), value.description.trim(), placesRef.current);
        onClose?.();
        form.reset();
        setSubmitError(null);
        onSuccess?.();
      } catch {
        setSubmitError(SAVE_ROUTE_MODAL.VALIDATION.SAVE_FAILED);
      }
    },
  });

  const isLoading = useStore(form.store, (s) => s.isSubmitting);

  const handleSubmit = async (e: React.FormEvent, places: RoutePlace[]) => {
    e.preventDefault();

    if (places.length === 0) {
      setSubmitError(SAVE_ROUTE_MODAL.VALIDATION.NO_PLACES);
      return;
    }

    // 배너 UX 유지: 제출 시점에 스키마 위반이면 첫 메시지를 배너로
    const parsed = saveRouteSchema.safeParse(form.state.values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? SAVE_ROUTE_MODAL.VALIDATION.TITLE_REQUIRED);
      return;
    }

    placesRef.current = places;
    setSubmitError(null);
    await form.handleSubmit();
  };

  const handleClose = () => {
    if (!isLoading) {
      form.reset();
      setSubmitError(null);
      onClose?.();
    }
  };

  return {
    form,
    isLoading,
    error: submitError,
    handleSubmit,
    handleClose,
    clearError: () => setSubmitError(null),
  };
}
