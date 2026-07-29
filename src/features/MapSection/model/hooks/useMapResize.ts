import { useEffect, useLayoutEffect } from 'react';
import { toast } from 'react-toastify';
import type { RefObject } from 'react';
import type { KakaoMap } from '../types';

interface UseMapResizeProps {
  mapRef: RefObject<KakaoMap | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  isLaptop: boolean;
}

export function useMapResize({ mapRef, containerRef, isLaptop }: UseMapResizeProps) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !window.kakao?.maps) return;

    if (mapRef.current) {
      container.innerHTML = '';
    }

    const newMap = new window.kakao.maps.Map(container, {
      center: new window.kakao.maps.LatLng(35.8, 127.5),
      level: 13,
      draggable: true,
      scrollwheel: true,
      disableDoubleClickZoom: false,
    });

    mapRef.current = newMap;
  }, [isLaptop, mapRef, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map || !window.kakao?.maps) return;

    const ro = new ResizeObserver(() => {
      try {
        const center = map.getCenter();
        window.kakao!.maps!.event.trigger(map, 'resize');
        map.setCenter(center);
      } catch {
        toast.error('지도 크기 조정 실패');
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [mapRef, containerRef]);
}
